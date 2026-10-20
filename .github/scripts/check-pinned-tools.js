// Keeps one issue listing pinned test tools that have a newer release at
// least COOLDOWN_DAYS old, and closes it once everything is current.
// Runs through actions/github-script.

const fs = require('fs');

const WORKFLOW = '.github/workflows/test.yml';
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

module.exports = async ({ github, context, core }) => {
  const updates = await findUpdates(github);

  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...context.repo, state: 'open', labels: LABEL, per_page: 100,
  });
  const issue = issues.find(i => !i.pull_request && i.title === TITLE);

  if (updates.length === 0) {
    core.info('All pinned test tools are current.');
    if (issue) {
      await github.rest.issues.createComment({
        ...context.repo, issue_number: issue.number, body: 'All pinned test tools are current.',
      });
      await github.rest.issues.update({
        ...context.repo, issue_number: issue.number, state: 'closed', state_reason: 'completed',
      });
    }
    return;
  }

  const body = [
    `Newer releases of tools pinned in \`${WORKFLOW}\` (at least ${COOLDOWN_DAYS} days old):`,
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
