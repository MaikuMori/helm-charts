// Keeps one issue listing pinned test tools and images that have a newer
// release at least COOLDOWN_DAYS old, and closes it once everything is
// current. Dependabot can't keep the digest-pinned test image current: it
// bumps only the tag. Runs through actions/github-script.

const fs = require('fs');
const path = require('path');

const WORKFLOWS = '.github/workflows';
const TEST_WORKFLOW = `${WORKFLOWS}/test.yml`;
const VALUES = 'charts/gotenberg/values.yaml';
const TITLE = 'Update pinned test tools';
const LABEL = 'dependencies';
const COOLDOWN_DAYS = 7;
const cutoff = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const TOOLS = [
  { name: 'Helm', repo: 'helm/helm', pin: /version: (v[1-9]\d*\.\d+\.\d+)$/gm },
  { name: 'helm-unittest', repo: 'helm-unittest/helm-unittest', pin: /helm-unittest\/releases\/download\/(v[\d.]+)\//g },
  { name: 'zizmor', repo: 'zizmorcore/zizmor', pin: /version: (\d+\.\d+\.\d+)$/gm },
  { name: 'kind', repo: 'kubernetes-sigs/kind', pin: /version: (v0\.\d+\.\d+)$/gm },
  { name: 'Gateway API CRDs', repo: 'kubernetes-sigs/gateway-api', pin: /gateway-api\/releases\/download\/(v[\d.]+)\//g },
];

const readWorkflows = () => fs.readdirSync(WORKFLOWS)
  .filter(f => /\.ya?ml$/.test(f))
  .map(f => ({ file: `${WORKFLOWS}/${f}`, text: fs.readFileSync(path.join(WORKFLOWS, f), 'utf8') }));

// The one version a tool is pinned to across all workflows.
function pinnedVersion(workflows, { name, pin }) {
  const versions = new Set(workflows.flatMap(({ text }) => [...text.matchAll(pin)].map(m => m[1])));
  if (versions.size === 0) throw new Error(`No pinned version for ${name} in ${WORKFLOWS} (pattern ${pin})`);
  if (versions.size > 1) throw new Error(`${name} is pinned to different versions: ${[...versions].join(', ')}`);
  return [...versions][0];
}

async function findUpdates(github, workflows) {
  const updates = [];
  for (const tool of TOOLS) {
    const current = pinnedVersion(workflows, tool);
    const [owner, repo] = tool.repo.split('/');
    const { data: release } = await github.rest.repos.getLatestRelease({ owner, repo });
    const latest = release.tag_name;

    if (latest.replace(/^v/, '') === current.replace(/^v/, '')) continue;
    if (Date.parse(release.published_at) > cutoff) continue;

    updates.push(`- **${tool.name}** \`${current}\` → [\`${latest}\`](${release.html_url})`);
  }
  return updates;
}

// The k8s matrix must list exactly the node images of the pinned kind release.
async function findKindNodeImageUpdate(github, workflows) {
  const kind = pinnedVersion(workflows, TOOLS.find(t => t.repo === 'kubernetes-sigs/kind'));
  const workflow = fs.readFileSync(TEST_WORKFLOW, 'utf8');
  const matrix = workflow.match(/^ +k8s:\n((?: +- .*\n)+)/m)?.[1];
  if (!matrix) throw new Error(`No k8s matrix in ${TEST_WORKFLOW}`);
  const pinned = [...matrix.matchAll(/- (v[\d.]+@sha256:[a-f0-9]{64})/g)].map(m => m[1]);

  const { data: release } = await github.rest.repos.getReleaseByTag({
    owner: 'kubernetes-sigs', repo: 'kind', tag: kind,
  });
  const images = [...new Set([...release.body.matchAll(/^\* v[\d.]+: `kindest\/node:(v[\d.]+@sha256:[a-f0-9]{64})`/gm)].map(m => m[1]))];
  if (images.length === 0) throw new Error(`No node images in the kind ${kind} release notes`);

  if (images.join() === pinned.join()) return null;
  return [
    `- **kind node images** (\`k8s\` matrix in \`${TEST_WORKFLOW}\`) don't match the [kind ${kind} release](${release.html_url}):`,
    '  ```yaml',
    ...images.map(i => `  - ${i}`),
    '  ```',
  ].join('\n');
}

// MicroShift tags ending in .ec.N are OKD engineering candidates.
async function findMicroShiftUpdate(github) {
  const workflow = fs.readFileSync(TEST_WORKFLOW, 'utf8');
  const current = workflow.match(/ghcr\.io\/microshift-io\/microshift:([^@\s]+)@sha256:/)?.[1];
  if (!current) throw new Error(`No pinned MicroShift image in ${TEST_WORKFLOW}`);

  const releases = await github.paginate(github.rest.repos.listReleases, {
    owner: 'microshift-io', repo: 'microshift', per_page: 100,
  });
  const pinnedAt = Date.parse(releases.find(r => r.tag_name === current)?.published_at ?? 0);
  const latest = releases
    .filter(r => !r.prerelease && !r.draft && !/\.ec\.\d+$/.test(r.tag_name))
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
  if (!latest || latest.tag_name === current) return null;
  if (Date.parse(latest.published_at) <= pinnedAt || Date.parse(latest.published_at) > cutoff) return null;
  return `- **MicroShift** \`${current}\` → [\`${latest.tag_name}\`](${latest.html_url}) (pin its \`ghcr.io/microshift-io/microshift\` digest)`;
}

const parseVersion = v => v.split('.').map(Number);
const compareVersions = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

// Newest x.y.z tag of the helm test image on Docker Hub, and whether the
// pinned tag was rebuilt under a different digest.
async function findTestImageUpdate() {
  const values = fs.readFileSync(VALUES, 'utf8');
  const block = values.match(/^testImage:.*\n((?:[ #].*\n|\n)*)/m)?.[1];
  const field = key => block?.match(new RegExp(`^  ${key}: *"?([^"\\s]+)"?`, 'm'))?.[1];
  const repository = field('repository');
  const tag = field('tag');
  const digest = field('digest');
  if (!repository || !tag || !digest) {
    throw new Error(`No testImage repository, tag and digest in ${VALUES}`);
  }

  const hubRepository = repository.includes('/') ? repository : `library/${repository}`;
  const response = await fetch(
    `https://hub.docker.com/v2/repositories/${hubRepository}/tags?page_size=100&ordering=last_updated`,
  );
  if (!response.ok) throw new Error(`Docker Hub tag lookup for ${repository} failed with HTTP ${response.status}`);
  const { results } = await response.json();

  const releases = results
    .filter(r => /^\d+\.\d+\.\d+$/.test(r.name) && r.digest && Date.parse(r.tag_last_pushed) <= cutoff)
    .sort((a, b) => compareVersions(parseVersion(b.name), parseVersion(a.name)));
  const newest = releases[0];
  if (!newest) return null;

  const pinned = results.find(r => r.name === tag);
  let target = null;
  if (compareVersions(parseVersion(newest.name), parseVersion(tag)) > 0) {
    target = newest;
  } else if (pinned?.digest && pinned.digest !== digest && Date.parse(pinned.tag_last_pushed) <= cutoff) {
    target = pinned;
  }
  if (!target) return null;

  const url = `https://hub.docker.com/_/${repository}/tags?name=${target.name}`;
  return `- **helm test image** (\`testImage\` in \`${VALUES}\`) \`${repository}:${tag}@${digest.slice(0, 19)}…\` → [\`${target.name}\`](${url}): \`tag: "${target.name}"\`, \`digest: "${target.digest}"\``;
}

module.exports = async ({ github, context, core }) => {
  const workflows = readWorkflows();
  const updates = await findUpdates(github, workflows);
  for (const update of [
    await findKindNodeImageUpdate(github, workflows),
    await findMicroShiftUpdate(github),
    await findTestImageUpdate(),
  ]) {
    if (update) updates.push(update);
  }

  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...context.repo, state: 'open', labels: LABEL, per_page: 100,
  });
  const issue = issues.find(i => !i.pull_request && i.title === TITLE);

  if (updates.length === 0) {
    core.info('All pinned test tools and images are current.');
    if (issue) {
      await github.rest.issues.createComment({
        ...context.repo, issue_number: issue.number, body: 'All pinned test tools and images are current.',
      });
      await github.rest.issues.update({
        ...context.repo, issue_number: issue.number, state: 'closed', state_reason: 'completed',
      });
    }
    return;
  }

  const body = [
    `Newer releases of pinned test tools and images (at least ${COOLDOWN_DAYS} days old):`,
    '',
    ...updates,
  ].join('\n');
  core.info(body);

  if (issue) {
    await github.rest.issues.update({ ...context.repo, issue_number: issue.number, body });
  } else {
    await github.rest.issues.create({ ...context.repo, title: TITLE, labels: [LABEL], body });
  }
};
