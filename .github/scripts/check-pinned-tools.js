// Keeps one pull request that updates the pinned test tools and images with a
// newer release at least COOLDOWN_DAYS old, and closes it once everything is
// current. Dependabot can't keep these current: it doesn't track them, or, for
// the digest-pinned test image, bumps only the tag. Runs through
// actions/github-script.

const fs = require('fs');
const path = require('path');

const WORKFLOWS = '.github/workflows';
const TEST_WORKFLOW = `${WORKFLOWS}/test.yml`;
const VALUES = 'charts/gotenberg/values.yaml';
const HELPERS = 'charts/gotenberg/templates/_helpers.tpl';
const BRANCH = 'update-pinned-test-tools';
const TITLE = 'Update pinned test tools';
const LABEL = 'dependencies';
const BOT = process.env.BOT ?? 'github-actions[bot]';
const COOLDOWN_DAYS = 7;
const cutoff = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const TOOLS = [
  { name: 'Helm', repo: 'helm/helm', pin: /version: (v[1-9]\d*\.\d+\.\d+)$/gm },
  { name: 'helm-unittest', repo: 'helm-unittest/helm-unittest', pin: /helm-unittest\/releases\/download\/(v[\d.]+)\//g },
  { name: 'zizmor', repo: 'zizmorcore/zizmor', pin: /version: (\d+\.\d+\.\d+)$/gm },
  { name: 'kind', repo: 'kubernetes-sigs/kind', pin: /version: (v0\.\d+\.\d+)$/gm },
  { name: 'Gateway API CRDs', repo: 'kubernetes-sigs/gateway-api', pin: /gateway-api\/releases\/download\/(v[\d.]+)\//g },
];

// Files as the updates leave them, read from the checkout on first use.
const files = new Map();
const read = file => files.get(file) ?? fs.readFileSync(file, 'utf8');
const write = (file, text) => files.set(file, text);

const workflowFiles = () => fs.readdirSync(WORKFLOWS)
  .filter(f => /\.ya?ml$/.test(f))
  .map(f => path.posix.join(WORKFLOWS, f));

// The one version a tool is pinned to across all workflows.
function pinnedVersion({ name, pin }) {
  const versions = new Set(workflowFiles().flatMap(file => [...read(file).matchAll(pin)].map(m => m[1])));
  if (versions.size === 0) throw new Error(`No pinned version for ${name} in ${WORKFLOWS} (pattern ${pin})`);
  if (versions.size > 1) throw new Error(`${name} is pinned to different versions: ${[...versions].join(', ')}`);
  return [...versions][0];
}

// Swaps the version on every line a pin matches, in every form it takes there,
// e.g. both versions of .../download/v1.2.1/unittest-1.2.1.tgz.
function bumpPin({ pin }, current, latest) {
  const bare = v => v.replace(/^v/, '');
  for (const file of workflowFiles()) {
    const lines = read(file).split('\n');
    const bumped = lines.map(line => {
      const matches = [...line.matchAll(new RegExp(pin.source, pin.flags.replace('m', '')))];
      return matches.some(m => m[1] === current) ? line.replaceAll(bare(current), bare(latest)) : line;
    });
    write(file, bumped.join('\n'));
  }
}

async function updateTools(github) {
  const updates = [];
  for (const tool of TOOLS) {
    const current = pinnedVersion(tool);
    const [owner, repo] = tool.repo.split('/');
    const { data: release } = await github.rest.repos.getLatestRelease({ owner, repo });
    const latest = release.tag_name;
    const pinned = current.startsWith('v') ? latest : latest.replace(/^v/, '');

    if (pinned === current) continue;
    if (Date.parse(release.published_at) > cutoff) continue;

    bumpPin(tool, current, pinned);
    updates.push(`- **${tool.name}** \`${current}\` → [\`${pinned}\`](${release.html_url})`);
  }
  return updates;
}

// The k8s matrix must list exactly the node images of the pinned kind release.
async function updateKindNodeImages(github) {
  const kind = pinnedVersion(TOOLS.find(t => t.repo === 'kubernetes-sigs/kind'));
  const workflow = read(TEST_WORKFLOW);
  const matrix = workflow.match(/^( +)k8s:\n((?: +- .*\n)+)/m);
  if (!matrix) throw new Error(`No k8s matrix in ${TEST_WORKFLOW}`);
  const pinned = [...matrix[2].matchAll(/- (v[\d.]+@sha256:[a-f0-9]{64})/g)].map(m => m[1]);

  const { data: release } = await github.rest.repos.getReleaseByTag({
    owner: 'kubernetes-sigs', repo: 'kind', tag: kind,
  });
  const images = [...new Set([...release.body.matchAll(/^\* v[\d.]+: `kindest\/node:(v[\d.]+@sha256:[a-f0-9]{64})`/gm)].map(m => m[1]))];
  if (images.length === 0) throw new Error(`No node images in the kind ${kind} release notes`);
  if (images.join() === pinned.join()) return null;

  const indent = `${matrix[1]}  `;
  write(TEST_WORKFLOW, workflow.replace(matrix[2], images.map(i => `${indent}- ${i}\n`).join('')));
  return `- **kind node images** (\`k8s\` matrix in \`${TEST_WORKFLOW}\`) set to the [kind ${kind} release](${release.html_url})'s`;
}

// Digest of an image tag on ghcr.io, through an anonymous pull token.
async function ghcrDigest(repository, tag) {
  const tokenResponse = await fetch(`https://ghcr.io/token?scope=repository:${repository}:pull`);
  if (!tokenResponse.ok) throw new Error(`ghcr.io token for ${repository} failed with HTTP ${tokenResponse.status}`);
  const { token } = await tokenResponse.json();
  const response = await fetch(`https://ghcr.io/v2/${repository}/manifests/${tag}`, {
    method: 'HEAD',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: [
        'application/vnd.oci.image.index.v1+json',
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.docker.distribution.manifest.v2+json',
      ].join(', '),
    },
  });
  const digest = response.headers.get('docker-content-digest');
  if (!response.ok || !digest) throw new Error(`ghcr.io manifest of ${repository}:${tag} failed with HTTP ${response.status}`);
  return digest;
}

// MicroShift tags ending in .ec.N are OKD engineering candidates.
async function updateMicroShift(github) {
  const workflow = read(TEST_WORKFLOW);
  const pin = workflow.match(/ghcr\.io\/microshift-io\/microshift:([^@\s]+)@(sha256:[a-f0-9]{64})/);
  if (!pin) throw new Error(`No pinned MicroShift image in ${TEST_WORKFLOW}`);
  const [image, current] = pin;

  const releases = await github.paginate(github.rest.repos.listReleases, {
    owner: 'microshift-io', repo: 'microshift', per_page: 100,
  });
  const pinnedAt = Date.parse(releases.find(r => r.tag_name === current)?.published_at ?? 0);
  const latest = releases
    .filter(r => !r.prerelease && !r.draft && !/\.ec\.\d+$/.test(r.tag_name))
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
  if (!latest || latest.tag_name === current) return null;
  if (Date.parse(latest.published_at) <= pinnedAt || Date.parse(latest.published_at) > cutoff) return null;

  const digest = await ghcrDigest('microshift-io/microshift', latest.tag_name);
  write(TEST_WORKFLOW, workflow.replace(image, `ghcr.io/microshift-io/microshift:${latest.tag_name}@${digest}`));
  return `- **MicroShift** \`${current}\` → [\`${latest.tag_name}\`](${latest.html_url})`;
}

const parseVersion = v => v.split('.').map(Number);
const compareVersions = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

// Newest x.y.z tag of the helm test image on Docker Hub, or the pinned tag
// when it was rebuilt under a different digest.
async function updateTestImage() {
  const values = read(VALUES);
  const helpers = read(HELPERS);
  const repository = values.match(/^testImage:.*\n(?:[ #].*\n)*?  repository: *"?([^"\s]+)"?/m)?.[1];
  const tag = helpers.match(/\$pinnedTag := "([^"]+)"/)?.[1];
  const digest = helpers.match(/\$pinnedDigest := "([^"]+)"/)?.[1];
  if (!repository || !tag || !digest) {
    throw new Error(`No testImage repository in ${VALUES}, or no pinned tag and digest in ${HELPERS}`);
  }

  const name = repository.replace(/^docker\.io\//, '');
  const hubRepository = name.includes('/') ? name : `library/${name}`;
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

  write(HELPERS, helpers
    .replace(/(\$pinnedTag := ")[^"]+/, `$1${target.name}`)
    .replace(/(\$pinnedDigest := ")[^"]+/, `$1${target.digest}`));
  const url = `https://hub.docker.com/r/${hubRepository.replace(/^library\//, '_/')}/tags?name=${target.name}`;
  return `- **helm test image** (\`gotenberg.testImage\` in \`${HELPERS}\`) \`${name}:${tag}@${digest.slice(0, 19)}…\` → [\`${name}:${target.name}@${target.digest.slice(0, 19)}…\`](${url})`;
}

// Commits the updated files on top of the default branch, through the API so
// the commit is signed.
async function commitFiles(github, repo, base, message) {
  const { data: baseCommit } = await github.rest.git.getCommit({ ...repo, commit_sha: base });
  const changed = [...files].filter(([file, text]) => text !== fs.readFileSync(file, 'utf8'));
  const { data: tree } = await github.rest.git.createTree({
    ...repo,
    base_tree: baseCommit.tree.sha,
    tree: changed.map(([file, content]) => ({ path: file, mode: '100644', type: 'blob', content })),
  });
  const { data: commit } = await github.rest.git.createCommit({
    ...repo, message, tree: tree.sha, parents: [base],
  });
  return commit;
}

module.exports = async ({ github, context, core }) => {
  const repo = context.repo;
  const updates = await updateTools(github);
  for (const update of [
    await updateKindNodeImages(github),
    await updateMicroShift(github),
    await updateTestImage(),
  ]) {
    if (update) updates.push(update);
  }

  const { data: repository } = await github.rest.repos.get(repo);
  const defaultBranch = repository.default_branch;
  const pulls = await github.rest.pulls.list({
    ...repo, state: 'open', head: `${repo.owner}:${BRANCH}`, per_page: 1,
  });
  const pull = pulls.data[0];
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...repo, state: 'open', labels: LABEL, per_page: 100,
  });
  const issue = issues.find(i => !i.pull_request && i.title === TITLE);

  // A pull request someone else pushed to is theirs to finish.
  let maintained = false;
  if (pull) {
    const { data: compare } = await github.rest.repos.compareCommitsWithBasehead({
      ...repo, basehead: `${defaultBranch}...${BRANCH}`,
    });
    maintained = compare.commits.some(c => c.author?.login !== BOT);
  }

  if (updates.length === 0) {
    core.info('All pinned test tools and images are current.');
    if (pull && !maintained) {
      await github.rest.issues.createComment({
        ...repo, issue_number: pull.number, body: 'All pinned test tools and images are current.',
      });
      await github.rest.pulls.update({ ...repo, pull_number: pull.number, state: 'closed' });
      await github.rest.git.deleteRef({ ...repo, ref: `heads/${BRANCH}` });
    }
    if (issue) {
      await github.rest.issues.update({
        ...repo, issue_number: issue.number, state: 'closed', state_reason: 'completed',
      });
    }
    return;
  }

  const body = [
    `Updates pinned test tools and images to newer releases at least ${COOLDOWN_DAYS} days old:`,
    '',
    ...updates,
  ].join('\n');
  core.info(body);

  if (maintained) {
    core.info(`PR #${pull.number} has commits from someone else, leaving it alone.`);
    return;
  }

  const { data: ref } = await github.rest.git.getRef({ ...repo, ref: `heads/${defaultBranch}` });
  const commit = await commitFiles(github, repo, ref.object.sha, TITLE);
  let number = pull?.number;
  if (pull) {
    const { data: head } = await github.rest.git.getCommit({ ...repo, commit_sha: pull.head.sha });
    const { data: base } = await github.rest.repos.compareCommitsWithBasehead({
      ...repo, basehead: `${defaultBranch}...${BRANCH}`,
    });
    // Leave the branch, and its checks, alone when it already holds these changes.
    if (head.tree.sha !== commit.tree.sha || base.behind_by > 0) {
      await github.rest.git.updateRef({ ...repo, ref: `heads/${BRANCH}`, sha: commit.sha, force: true });
    }
    await github.rest.pulls.update({ ...repo, pull_number: pull.number, title: TITLE, body });
  } else {
    try {
      await github.rest.git.createRef({ ...repo, ref: `refs/heads/${BRANCH}`, sha: commit.sha });
    } catch (e) {
      if (e.status !== 422) throw e;
      await github.rest.git.updateRef({ ...repo, ref: `heads/${BRANCH}`, sha: commit.sha, force: true });
    }
    const { data: created } = await github.rest.pulls.create({
      ...repo, title: TITLE, head: BRANCH, base: defaultBranch, body,
    });
    number = created.number;
    await github.rest.issues.addLabels({ ...repo, issue_number: number, labels: [LABEL] });
  }

  if (issue) {
    await github.rest.issues.createComment({
      ...repo, issue_number: issue.number, body: `Superseded by #${number}, which applies the updates.`,
    });
    await github.rest.issues.update({
      ...repo, issue_number: issue.number, state: 'closed', state_reason: 'completed',
    });
  }
};
