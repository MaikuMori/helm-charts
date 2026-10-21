// Installs earlier versions of the chart, upgrades each release to the chart in
// this checkout and runs `helm test`: the target branch's chart with the
// default and the hardened values, and the latest published minor releases
// with the default values. Releases go into one namespace that only enforces
// the Pod Security baseline level, since earlier versions may not meet
// restricted, and are kept for the render test.
// Usage: node test/upgrade-test.js <target branch> [published minor releases]

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { CHART, ROOT, text, run } = require('./lib');

const REPO = 'https://maikumori.github.io/helm-charts';
const NAMESPACE = 'upgrade';
const HARDENED = path.join(CHART, 'ci', 'hardened-values.yaml');

async function upgrade({ release, from, values }) {
  const common = ['--namespace', NAMESPACE, '--wait', '--timeout', '5m', ...(values ? ['--values', values] : [])];
  let log = await run('helm', ['install', release, ...from, ...common]);
  log += await run('helm', ['upgrade', release, CHART, ...common]);
  log += await run('helm', ['test', release, '--namespace', NAMESPACE, '--logs']);
  return log;
}

async function main() {
  const [targetBranch, count = '5'] = process.argv.slice(2);
  if (!targetBranch) throw new Error('Usage: upgrade-test.js <target branch> [published minor releases]');

  const previous = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'previous-'));
  execFileSync('bash', ['-c', `git archive "origin/${targetBranch}" charts/gotenberg | tar -x -C "${previous}"`], { cwd: ROOT, stdio: 'inherit' });
  const previousChart = path.join(previous, 'charts', 'gotenberg');

  const index = text('curl', ['-fsSL', `${REPO}/index.yaml`]);
  const minors = [...index.matchAll(/^\s+version: "?(\d+\.\d+\.0)"?$/gm)].map(m => m[1])
    .filter((v, i, all) => all.indexOf(v) === i)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .slice(0, Number(count));

  execFileSync('kubectl', ['create', 'namespace', NAMESPACE], { stdio: 'inherit' });
  execFileSync('kubectl', ['label', 'namespace', NAMESPACE, 'pod-security.kubernetes.io/enforce=baseline'], { stdio: 'inherit' });

  const cases = [
    { release: 'upgrade-previous', from: [previousChart] },
    { release: 'upgrade-previous-hardened', from: [previousChart], values: HARDENED },
    ...minors.map(v => ({ release: `upgrade-${v.replaceAll('.', '-')}`, from: ['gotenberg', '--repo', REPO, '--version', v] })),
  ];
  const results = await Promise.allSettled(cases.map(upgrade));

  let failed = false;
  results.forEach((result, i) => {
    const { release } = cases[i];
    console.log(`::group::${release}`);
    console.log(result.status === 'fulfilled' ? result.value : result.reason.message);
    console.log('::endgroup::');
    console.log(`${result.status === 'fulfilled' ? 'ok  ' : 'FAIL'} ${release}`);
    if (result.status === 'rejected') failed = true;
  });
  if (failed) process.exit(1);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
