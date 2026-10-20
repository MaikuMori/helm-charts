// Pushes the charts packaged by chart-releaser to GHCR, signs each OCI chart
// and release archive with keyless cosign, verifies both signatures, and
// attaches the archive's Sigstore bundle to its GitHub release.
// Runs through actions/github-script.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REGISTRY = 'oci://ghcr.io/maikumori/helm-charts';
const PACKAGES = '.cr-release-packages';
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';

function run(core, cmd, args) {
  core.info(`$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`.trim();
  if (output) core.info(output);
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args[0]} exited with ${result.status ?? result.signal}`);
  }
  return output;
}

module.exports = async ({ github, context, core }) => {
  const identity = `https://github.com/${process.env.GITHUB_WORKFLOW_REF}`;
  const verifyFlags = ['--certificate-identity', identity, '--certificate-oidc-issuer', OIDC_ISSUER];

  const packages = fs.existsSync(PACKAGES)
    ? fs.readdirSync(PACKAGES).filter(f => f.endsWith('.tgz'))
    : [];
  if (packages.length === 0) {
    core.info('No new chart packages to publish.');
    return;
  }

  for (const file of packages) {
    const pkg = path.join(PACKAGES, file);

    const pushed = run(core, 'helm', ['push', pkg, REGISTRY]);
    const ref = pushed.match(/^Pushed: (\S+):(\S+)$/m);
    const digest = pushed.match(/^Digest: (sha256:[0-9a-f]{64})$/m);
    if (!ref || !digest) {
      throw new Error(`Couldn't read the pushed reference and digest from helm push for ${file}`);
    }
    const [, repository, version] = ref;
    const image = `${repository}@${digest[1]}`;

    run(core, 'cosign', ['sign', '--yes', image]);
    run(core, 'cosign', ['verify', image, ...verifyFlags]);

    const bundle = `${pkg}.sigstore.json`;
    run(core, 'cosign', ['sign-blob', '--yes', '--bundle', bundle, pkg]);
    run(core, 'cosign', ['verify-blob', pkg, '--bundle', bundle, ...verifyFlags]);

    const tag = `${path.basename(repository)}-${version}`;
    const { data: release } = await github.rest.repos.getReleaseByTag({ ...context.repo, tag });
    await github.rest.repos.uploadReleaseAsset({
      ...context.repo,
      release_id: release.id,
      name: path.basename(bundle),
      data: fs.readFileSync(bundle),
      headers: { 'content-type': 'application/json' },
    });
    core.info(`Published and signed ${image}; attached ${path.basename(bundle)} to ${tag}.`);
  }
};
