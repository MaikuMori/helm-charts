// Keeps one issue listing pinned test tools and images that have a newer
// release at least COOLDOWN_DAYS old, and closes it once everything is
// current. Dependabot can't keep the digest-pinned test image current: it
// bumps only the tag. Runs through actions/github-script.

const fs = require('fs');

const WORKFLOW = '.github/workflows/test.yml';
const VALUES = 'charts/gotenberg/values.yaml';
const TITLE = 'Update pinned test tools';
const LABEL = 'dependencies';
const COOLDOWN_DAYS = 7;

const TOOLS = [
  { name: 'Helm', repo: 'helm/helm', pin: /version: (v[1-9]\d*\.\d+\.\d+)$/m },
  { name: 'helm-unittest', repo: 'helm-unittest/helm-unittest', pin: /helm-unittest\/releases\/download\/(v[\d.]+)\// },
  { name: 'zizmor', repo: 'zizmorcore/zizmor', pin: /version: (\d+\.\d+\.\d+)$/m },
  { name: 'kind (update the node images in the matrix too)', repo: 'kubernetes-sigs/kind', pin: /version: (v0\.\d+\.\d+)$/m },
  { name: 'Gateway API CRDs', repo: 'kubernetes-sigs/gateway-api', pin: /gateway-api\/releases\/download\/(v[\d.]+)\// },
];

async function findUpdates(github) {
  const workflow = fs.readFileSync(WORKFLOW, 'utf8');
  const cutoff = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const updates = [];

  for (const { name, repo, pin } of TOOLS) {
    const match = workflow.match(pin);
    if (!match) {
      throw new Error(`No pinned version for ${name} in ${WORKFLOW} (pattern ${pin})`);
    }
    const current = match[1];

    const [owner, repoName] = repo.split('/');
    const { data: release } = await github.rest.repos.getLatestRelease({ owner, repo: repoName });
    const latest = release.tag_name;

    if (latest.replace(/^v/, '') === current.replace(/^v/, '')) continue;
    if (Date.parse(release.published_at) > cutoff) continue;

    updates.push(`- **${name}** \`${current}\` → [\`${latest}\`](${release.html_url})`);
  }
  return updates;
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

  const cutoff = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
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
  const updates = await findUpdates(github);
  const imageUpdate = await findTestImageUpdate();
  if (imageUpdate) updates.push(imageUpdate);

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
