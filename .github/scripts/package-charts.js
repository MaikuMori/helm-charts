// Packages and GPG-signs every chart whose version has no GitHub release yet,
// writing the release notes from its CHANGELOG.md into the package first.
// The signing key only exists in a temporary directory for the duration of
// this script. Runs through actions/github-script.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CHARTS = 'charts';
const PACKAGES = '.cr-release-packages';
const SIGNING_KEY = 'helm@maikumori.com';
// chart-releaser reads release notes with this name from inside the package.
const RELEASE_NOTES = 'RELEASE_NOTES.md';

function chartMetadata(dir) {
  const chart = fs.readFileSync(path.join(dir, 'Chart.yaml'), 'utf8');
  const field = key => chart.match(new RegExp(`^${key}: *"?([^"\\s]+)"?$`, 'm'))?.[1];
  const name = field('name');
  const version = field('version');
  if (!name || !version) throw new Error(`No name or version in ${dir}/Chart.yaml`);
  return { name, version };
}

function releaseNotes(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex(l => l === `## ${version}`);
  if (start === -1) return '';
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim() + '\n';
}

async function isReleased(github, context, tag) {
  try {
    await github.rest.repos.getReleaseByTag({ ...context.repo, tag });
    return true;
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

module.exports = async ({ github, context, core }) => {
  const pending = [];
  for (const entry of fs.readdirSync(CHARTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(CHARTS, entry.name);
    const { name, version } = chartMetadata(dir);
    if (await isReleased(github, context, `${name}-${version}`)) {
      core.info(`${name} ${version} is already released.`);
    } else {
      pending.push({ dir, name, version });
    }
  }

  core.setOutput('packaged', pending.length > 0 ? 'true' : 'false');
  if (pending.length === 0) return;

  const keyDir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'gpg-'));
  try {
    const keyring = path.join(keyDir, 'secring.gpg');
    const passphrase = path.join(keyDir, 'passphrase');
    fs.writeFileSync(keyring, Buffer.from(process.env.SIGNING_KEY_BASE64, 'base64'), { mode: 0o600 });
    fs.writeFileSync(passphrase, Buffer.from(process.env.SIGNING_KEY_PASSPHRASE_BASE64, 'base64'), { mode: 0o600 });

    fs.mkdirSync(PACKAGES, { recursive: true });
    for (const { dir, name, version } of pending) {
      const changelog = path.join(dir, 'CHANGELOG.md');
      if (fs.existsSync(changelog)) {
        fs.writeFileSync(path.join(dir, RELEASE_NOTES), releaseNotes(fs.readFileSync(changelog, 'utf8'), version));
      }

      const result = spawnSync('helm', [
        'package', dir, '--destination', PACKAGES,
        '--sign', '--key', SIGNING_KEY, '--keyring', keyring, '--passphrase-file', passphrase,
      ], { encoding: 'utf8' });
      const output = `${result.stdout}${result.stderr}`.trim();
      if (output) core.info(output);
      if (result.status !== 0) {
        throw new Error(`helm package ${dir} failed: ${result.error?.message ?? `exit ${result.status}`}`);
      }
      core.info(`Packaged and signed ${name} ${version}.`);
    }
  } finally {
    fs.rmSync(keyDir, { recursive: true, force: true });
  }
};
