// Checks the Gotenberg flags against the flag table in templates/_helpers.tpl:
// - every flag of the chart's appVersion image is in the table or in
//   CHART_MANAGED, and every flag there exists upstream
// - every table value defaults to null, so an unset value leaves Gotenberg's
//   default
// - tests/values/all-flags.yaml sets every table value, and
//   ci/every-flag-values.yaml every one but EVERY_FLAG_EXCLUDED
// - each table value renders its flag when set to its type's zero: 0, false,
//   "" or [], unless the schema rejects that zero
// Needs helm, yq and docker.
// Usage: node test/flags-test.js

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { CHART, text, json } = require('./lib');

// Flags the chart sets from values that also configure other Kubernetes objects.
const CHART_MANAGED = {
  'api-port': 'api.port, which the container port and the Service use too',
  'api-port-from-env': 'would move the port away from the container port and the Service',
  'api-tls-cert-file': 'api.tlsSecretName mounts the certificate',
  'api-tls-key-file': 'api.tlsSecretName mounts the key',
  'api-enable-basic-auth': 'api.basicAuth.enabled, which sets the credentials too',
  'gotenberg-graceful-shutdown-duration': 'gotenberg.gracefulShutdownDurationSec, which terminationGracePeriodSeconds follows',
};

// Values ci/every-flag-values.yaml leaves out, because the render test can't pass with them.
const EVERY_FLAG_EXCLUDED = {
  'api.rootPath': 'moves the routes the render test calls',
  'api.enableOidcAuth': 'the render test sends no token',
  'api.oidcIssuer': 'needs api.enableOidcAuth',
  'api.oidcAudience': 'needs api.enableOidcAuth',
  'api.oidcJwksUrl': 'needs api.enableOidcAuth',
  'api.disableDownloadFrom': 'disables a feature on purpose',
  'api.downloadFromDenyPublicIps': 'blocks every URL along with downloadFromDenyPrivateIps',
  'chromium.disableRoutes': 'the render test converts with Chromium',
  'chromium.disableJavaScript': 'the render test checks JavaScript runs',
  'chromium.proxyServer': 'needs a proxy',
  'chromium.hostResolverRules': 'conflicts with chromium.enableEnvironmentProxy',
  'chromium.denyPublicIps': 'blocks every URL along with denyPrivateIps',
  'libreOffice.disableRoutes': 'the render test converts with LibreOffice',
  'libreOffice.denyPublicIps': 'blocks every URL along with denyPrivateIps',
  'pdf.disableRoutes': 'the render test uses the PDF routes',
  'pdf.disableStages': 'the render test runs stages',
  'pdf.denyPublicIps': 'blocks every URL along with denyPrivateIps',
  'webhook.disable': 'disables a feature on purpose',
  'webhook.denyPublicIps': 'blocks every URL along with denyPrivateIps',
};

const read = file => fs.readFileSync(path.join(CHART, file), 'utf8');
const yamlFile = file => json('yq', ['-o=json', '.', path.join(CHART, file)]);
const lookup = (values, dotted) => dotted.split('.').reduce((v, key) => (v == null ? undefined : v[key]), values);
const schemaAt = (schema, dotted) => dotted.split('.').reduce((s, key) => s?.properties?.[key], schema);

function upstreamFlags() {
  const appVersion = read('Chart.yaml').match(/^appVersion: "?([^"\n]+)"?$/m)[1];
  const { stdout, stderr, error } = spawnSync('docker', [
    'run', '--rm', '--entrypoint', 'gotenberg', `gotenberg/gotenberg:${appVersion}`, '--help',
  ], { encoding: 'utf8' });
  if (error) throw error;
  const flags = [...`${stdout}${stderr}`.matchAll(/^\s+--([a-z0-9-]+)/gm)].map(m => m[1]).filter(f => f !== 'help');
  if (flags.length === 0) throw new Error(`No flags in the --help of gotenberg/gotenberg:${appVersion}`);
  return { appVersion, flags: new Set(flags) };
}

function renderArgs(set) {
  const result = spawnSync('helm', [
    'template', 'flags', CHART, '--show-only', 'templates/deployment.yaml', '--set-json', set,
  ], { encoding: 'utf8' });
  if (result.status !== 0) return { error: result.stderr };
  return { args: JSON.parse(text('yq', ['-o=json', '.spec.template.spec.containers[0].args'], { input: result.stdout })) };
}

function main() {
  const table = [...read('templates/_helpers.tpl').matchAll(/\(list "([a-z0-9-]+)" \.Values\.([A-Za-z.]+)\)/g)]
    .map(([, flag, value]) => ({ flag, value }));
  if (table.length === 0) throw new Error('No flag table in templates/_helpers.tpl');
  const failures = [];

  const { appVersion, flags: upstream } = upstreamFlags();
  const mapped = new Set([...table.map(t => t.flag), ...Object.keys(CHART_MANAGED)]);
  for (const flag of upstream) {
    if (!mapped.has(flag)) failures.push(`--${flag} of Gotenberg ${appVersion} has no value in the flag table`);
  }
  for (const flag of mapped) {
    if (!upstream.has(flag)) failures.push(`--${flag} doesn't exist in Gotenberg ${appVersion}`);
  }

  const defaults = yamlFile('values.yaml');
  const allFlags = yamlFile('tests/values/all-flags.yaml');
  const everyFlag = yamlFile('ci/every-flag-values.yaml');
  const schema = JSON.parse(read('values.schema.json'));
  for (const { flag, value } of table) {
    if (lookup(defaults, value) !== null) failures.push(`${value} must default to null, so unset leaves --${flag} to Gotenberg`);
    if (lookup(allFlags, value) == null) failures.push(`tests/values/all-flags.yaml doesn't set ${value}`);
    const excluded = value in EVERY_FLAG_EXCLUDED;
    const inEveryFlag = lookup(everyFlag, value) != null;
    if (!excluded && !inEveryFlag) failures.push(`ci/every-flag-values.yaml doesn't set ${value}`);
    if (excluded && inEveryFlag) failures.push(`ci/every-flag-values.yaml sets ${value}, which EVERY_FLAG_EXCLUDED lists`);

    const types = [schemaAt(schema, value)?.type ?? []].flat();
    const [zero, want] = types.includes('integer') ? [0, `--${flag}=0`]
      : types.includes('boolean') ? [false, `--${flag}=false`]
        : types.includes('array') ? [[], `--${flag}=`]
          : [''.toString(), `--${flag}=`];
    const { args, error } = renderArgs(`${value}=${JSON.stringify(zero)}`);
    if (error) {
      if (!/values don't meet the specifications of the schema/.test(error)) failures.push(`${value}=${JSON.stringify(zero)} fails to render: ${error.trim()}`);
      else console.log(`ok   ${value}: the schema rejects ${JSON.stringify(zero)}`);
    } else if (!args.includes(want)) {
      failures.push(`${value}=${JSON.stringify(zero)} renders no ${want}`);
    } else {
      console.log(`ok   ${value}: ${JSON.stringify(zero)} renders ${want}`);
    }
  }
  for (const value of Object.keys(EVERY_FLAG_EXCLUDED)) {
    if (!table.some(t => t.value === value)) failures.push(`EVERY_FLAG_EXCLUDED lists ${value}, which the flag table doesn't`);
  }

  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(`${table.length} flags in the table, ${Object.keys(CHART_MANAGED).length} chart-managed, Gotenberg ${appVersion} has ${upstream.size}`);
  if (failures.length > 0) process.exit(1);
}

main();
