// Makes every released chart version available and signed on GHCR, and its
// release archive signed with a Sigstore bundle on the GitHub release.
// Always works from the archive attached to the GitHub release, never pushes
// over an existing OCI version, and only signs what isn't verifiably signed,
// so re-runs repair a partially published release. Writes the archives' and
// OCI charts' digests to a checksums file for the provenance attestation step
// and returns its path as the `subjects` output.
// Runs through actions/github-script.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CHARTS = 'charts';
const PACKAGES = '.cr-release-packages';
const REGISTRY_HOST = 'ghcr.io';
const REGISTRY_PATH = 'maikumori/helm-charts';
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';

function run(core, cmd, args, { check = true } = {}) {
  core.info(`$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (output) core.info(output);
  const ok = result.status === 0;
  if (!ok && check) {
    throw new Error(`${cmd} ${args[0]} failed: ${result.error?.message ?? `exit ${result.status ?? result.signal}`}`);
  }
  return { ok, output };
}

function chartMetadata(dir) {
  const chart = fs.readFileSync(path.join(dir, 'Chart.yaml'), 'utf8');
  const field = key => chart.match(new RegExp(`^${key}: *"?([^"\\s]+)"?$`, 'm'))?.[1];
  return { name: field('name'), version: field('version') };
}

async function releaseByTag(github, context, tag) {
  try {
    return (await github.rest.repos.getReleaseByTag({ ...context.repo, tag })).data;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function downloadAsset(github, context, asset, file) {
  const { data } = await github.rest.repos.getReleaseAsset({
    ...context.repo, asset_id: asset.id, headers: { accept: 'application/octet-stream' },
  });
  fs.writeFileSync(file, Buffer.from(data));
}

// Digest of an existing OCI chart version, or null when it doesn't exist.
async function ociDigest(name, version) {
  const repository = `${REGISTRY_PATH}/${name}`;
  const credentials = Buffer.from(`${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}`).toString('base64');
  const tokenResponse = await fetch(
    `https://${REGISTRY_HOST}/token?service=${REGISTRY_HOST}&scope=repository:${repository}:pull`,
    { headers: { authorization: `Basic ${credentials}` } },
  );
  if (!tokenResponse.ok) throw new Error(`GHCR token request failed with HTTP ${tokenResponse.status}`);
  const { token } = await tokenResponse.json();

  const response = await fetch(`https://${REGISTRY_HOST}/v2/${repository}/manifests/${version}`, {
    method: 'HEAD',
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.oci.image.manifest.v1+json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GHCR manifest lookup for ${name}:${version} failed with HTTP ${response.status}`);
  return response.headers.get('docker-content-digest');
}

module.exports = async ({ github, context, core }) => {
  const identity = `https://github.com/${process.env.GITHUB_WORKFLOW_REF}`;
  const verifyFlags = ['--certificate-identity', identity, '--certificate-oidc-issuer', OIDC_ISSUER];
  const workDir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'publish-'));
  const subjects = [];

  for (const entry of fs.readdirSync(CHARTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const { name, version } = chartMetadata(path.join(CHARTS, entry.name));
    const tag = `${name}-${version}`;
    const archive = `${tag}.tgz`;

    const release = await releaseByTag(github, context, tag);
    if (!release) {
      if (fs.existsSync(path.join(PACKAGES, archive))) {
        throw new Error(`${archive} was packaged but has no GitHub release`);
      }
      core.info(`${name} ${version} isn't released; nothing to publish.`);
      continue;
    }

    const assets = new Map(release.assets.map(a => [a.name, a]));
    for (const required of [archive, `${archive}.prov`]) {
      if (!assets.has(required)) throw new Error(`Release ${tag} has no ${required}`);
    }
    const dir = fs.mkdtempSync(path.join(workDir, `${tag}-`));
    const pkg = path.join(dir, archive);
    await downloadAsset(github, context, assets.get(archive), pkg);
    await downloadAsset(github, context, assets.get(`${archive}.prov`), `${pkg}.prov`);

    let digest = await ociDigest(name, version);
    if (digest) {
      core.info(`${name}:${version} is already on ${REGISTRY_HOST} (${digest}); not pushing over it.`);
    } else {
      const { output } = run(core, 'helm', ['push', pkg, `oci://${REGISTRY_HOST}/${REGISTRY_PATH}`]);
      digest = output.match(/^Digest: (sha256:[0-9a-f]{64})$/m)?.[1];
      if (!digest) throw new Error(`Couldn't read the digest from helm push for ${archive}`);
    }

    const image = `${REGISTRY_HOST}/${REGISTRY_PATH}/${name}@${digest}`;
    subjects.push(`${crypto.createHash('sha256').update(fs.readFileSync(pkg)).digest('hex')}  ${archive}`);
    subjects.push(`${digest.replace(/^sha256:/, '')}  ${REGISTRY_HOST}/${REGISTRY_PATH}/${name}`);
    if (!run(core, 'cosign', ['verify', image, ...verifyFlags], { check: false }).ok) {
      run(core, 'cosign', ['sign', '--yes', image]);
      run(core, 'cosign', ['verify', image, ...verifyFlags]);
    }

    const bundleName = `${archive}.sigstore.json`;
    const bundle = path.join(dir, bundleName);
    const existing = assets.get(bundleName);
    if (existing) {
      await downloadAsset(github, context, existing, bundle);
      if (run(core, 'cosign', ['verify-blob', pkg, '--bundle', bundle, ...verifyFlags], { check: false }).ok) {
        core.info(`${bundleName} on ${tag} is valid.`);
        continue;
      }
      core.warning(`${bundleName} on ${tag} doesn't verify; replacing it.`);
      await github.rest.repos.deleteReleaseAsset({ ...context.repo, asset_id: existing.id });
    }

    run(core, 'cosign', ['sign-blob', '--yes', '--bundle', bundle, pkg]);
    run(core, 'cosign', ['verify-blob', pkg, '--bundle', bundle, ...verifyFlags]);
    await github.rest.repos.uploadReleaseAsset({
      ...context.repo,
      release_id: release.id,
      name: bundleName,
      data: fs.readFileSync(bundle),
      headers: { 'content-type': 'application/json' },
    });
    core.info(`Signed ${image} and attached ${bundleName} to ${tag}.`);
  }

  if (subjects.length > 0) {
    const file = path.join(workDir, 'attestation-subjects.txt');
    fs.writeFileSync(file, `${subjects.join('\n')}\n`);
    core.setOutput('subjects', file);
  }
};
