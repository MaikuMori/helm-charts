// Checks that a numeric value set to 0 reaches the rendered manifests wherever
// any other number would, instead of being dropped by a template's `if`, `with`
// or `default`: every line that a sentinel value adds must also appear with 0.
// Covers every integer or number value in values.schema.json whose default
// isn't already 0, rendered with the defaults and with every optional feature
// enabled. Values where 0 has no meaning of its own are listed in ZERO_IGNORED.
// Usage: node .github/scripts/zero-values-test.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHART = path.join(__dirname, '..', '..', 'charts', 'gotenberg');
const SENTINEL = '4271';
const API_VERSIONS = ['monitoring.coreos.com/v1', 'autoscaling.k8s.io/v1', 'gateway.networking.k8s.io/v1'];

const ZERO_IGNORED = {
  'autoscaling.targetCPUUtilizationPercentage': 'a 0% utilization target is meaningless; unset disables the metric',
  'autoscaling.targetMemoryUtilizationPercentage': 'a 0% utilization target is meaningless; unset disables the metric',
  // The schema only allows integers, so 0 is how users unset it to use pdb.maxUnavailable instead.
  'pdb.minAvailable': '0 leaves it out so pdb.maxUnavailable can be used',
};

function leaves(schema, prefix = '') {
  const out = [];
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    const types = [prop.type ?? []].flat();
    if (prop.properties) out.push(...leaves(prop, name));
    else if (types.includes('integer') || types.includes('number')) out.push({ name, def: prop.default });
  }
  return out;
}

// Boolean `enabled` and `create` switches, to turn on every optional template.
function switches(schema, prefix = '') {
  const out = [];
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (prop.properties) out.push(...switches(prop, name));
    else if ((key === 'enabled' || key === 'create') && [prop.type].flat().includes('boolean') && name !== 'enabled') out.push(name);
  }
  return out;
}

const render = (base, set) => execFileSync('helm', [
  'template', 'zero', CHART, ...API_VERSIONS.flatMap(v => ['--api-versions', v]),
  ...[...base, ...set].flatMap(s => ['--set-json', s]),
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function main() {
  const schema = JSON.parse(fs.readFileSync(path.join(CHART, 'values.schema.json'), 'utf8'));
  const values = execFileSync('helm', ['show', 'values', CHART], { encoding: 'utf8' });
  const bases = [[], switches(schema).map(s => `${s}=true`)];
  let failures = 0;
  for (const { name } of leaves(schema)) {
    const def = lookup(values, name);
    if (def === 0) continue;
    if (ZERO_IGNORED[name]) {
      console.log(`skip ${name}: ${ZERO_IGNORED[name]}`);
      continue;
    }
    const missing = [];
    let shown = false;
    for (const base of bases) {
      const lines = text => new Set(text.split('\n'));
      const sentinel = render(base, [`${name}=${SENTINEL}`]).split('\n').filter(l => l.includes(SENTINEL));
      if (sentinel.length === 0) continue;
      shown = true;
      let zero;
      try {
        zero = lines(render(base, [`${name}=0`]));
      } catch (e) {
        // Rejecting 0 outright (schema minimum, template fail) doesn't drop it silently.
        continue;
      }
      for (const line of sentinel) {
        const expected = line.replaceAll(SENTINEL, '0');
        if (!zero.has(expected)) missing.push(expected.trim());
      }
    }
    if (!shown) {
      failures++;
      console.log(`FAIL ${name}: no rendered line shows a set value`);
    } else if (missing.length > 0) {
      failures++;
      console.log(`FAIL ${name}: 0 doesn't render ${[...new Set(missing)].join(', ')}`);
    } else {
      console.log(`ok   ${name}`);
    }
  }
  if (failures > 0) process.exit(1);
}

function lookup(yaml, name) {
  const json = execFileSync('yq', ['-o=json', `.${name}`], { input: yaml, encoding: 'utf8' });
  return JSON.parse(json);
}

main();
