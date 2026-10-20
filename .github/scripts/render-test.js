// Converts the fixtures in test/render with every Gotenberg release installed
// in the current cluster (left behind by `ct install --skip-clean-up`) and
// checks each PDF contains the fixture's marker text. Releases running with
// --chromium-deny-private-ips must also refuse to render a private address.
// Usage: node .github/scripts/render-test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'render');
const PRIVATE_URL = 'http://169.254.169.254/latest/meta-data/';
const CONVERSIONS = [
  {
    module: 'Chromium',
    route: '/forms/chromium/convert/html',
    file: 'index.html',
    contentType: 'text/html',
    markers: ['Chromium render test', 'JavaScript render marker'],
  },
  {
    module: 'LibreOffice',
    route: '/forms/libreoffice/convert',
    file: 'document.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    markers: ['LibreOffice render test'],
  },
];

const json = (cmd, args) => JSON.parse(execFileSync(cmd, args, { encoding: 'utf8' }));

function portForward(namespace, service, port) {
  const child = spawn('kubectl', ['port-forward', '-n', namespace, `svc/${service}`, `0:${port}`]);
  return new Promise((resolve, reject) => {
    let output = '';
    const onData = data => {
      output += data;
      const match = output.match(/Forwarding from 127\.0\.0\.1:(\d+)/);
      if (match) resolve({ localPort: Number(match[1]), stop: () => child.kill() });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', code => reject(new Error(`kubectl port-forward exited with ${code}: ${output}`)));
  });
}

async function convert(baseUrl, { route, file, contentType }) {
  const form = new FormData();
  form.append('files', new Blob([fs.readFileSync(path.join(FIXTURES, file))], { type: contentType }), file);
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${baseUrl}${route}`, { method: 'POST', body: form });
      const body = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.toString('utf8', 0, 300)}`);
      return body;
    } catch (e) {
      if (attempt === 5) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

function pdfText(pdf) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'render-')), 'out.pdf');
  fs.writeFileSync(file, pdf);
  return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
}

async function main() {
  const releases = json('helm', ['list', '--all-namespaces', '--output', 'json'])
    .filter(r => r.chart.startsWith('gotenberg-'));
  if (releases.length === 0) throw new Error('No Gotenberg releases installed');

  let failures = 0;
  for (const { name, namespace } of releases) {
    const services = json('kubectl', [
      'get', 'service', '-n', namespace, '-l', `app.kubernetes.io/instance=${name}`, '-o', 'json',
    ]).items;
    if (services.length !== 1) throw new Error(`Expected one Service for ${namespace}/${name}, found ${services.length}`);
    const service = services[0];
    const args = json('kubectl', [
      'get', 'deployment', '-n', namespace, '-l', `app.kubernetes.io/instance=${name}`, '-o', 'json',
    ]).items[0].spec.template.spec.containers[0].args ?? [];
    const { localPort, stop } = await portForward(namespace, service.metadata.name, service.spec.ports[0].port);

    try {
      for (const conversion of CONVERSIONS) {
        const label = `${namespace}/${name}: ${conversion.module} (${conversion.file})`;
        try {
          const pdf = await convert(`http://127.0.0.1:${localPort}`, conversion);
          if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('response is not a PDF');
          const text = pdfText(pdf);
          const missing = conversion.markers.filter(m => !text.includes(m));
          if (missing.length > 0) throw new Error(`PDF is missing ${missing.map(m => `"${m}"`).join(', ')}`);
          console.log(`ok   ${label}: ${pdf.length} bytes`);
        } catch (e) {
          failures++;
          console.log(`FAIL ${label}: ${e.message}`);
        }
      }
      if (args.includes('--chromium-deny-private-ips')) {
        const label = `${namespace}/${name}: Chromium refuses ${PRIVATE_URL}`;
        const form = new FormData();
        form.append('url', PRIVATE_URL);
        const response = await fetch(`http://127.0.0.1:${localPort}/forms/chromium/convert/url`, { method: 'POST', body: form });
        if (response.status === 403) {
          console.log(`ok   ${label}`);
        } else {
          failures++;
          console.log(`FAIL ${label}: got HTTP ${response.status}, want 403`);
        }
      }
    } finally {
      stop();
    }
  }
  if (failures > 0) process.exit(1);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
