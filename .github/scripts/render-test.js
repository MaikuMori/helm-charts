// Exercises every Gotenberg release installed in the current cluster (left
// behind by `ct install --skip-clean-up`) with the fixtures in test/render:
// Chromium and LibreOffice conversions, a Chromium screenshot, and merging,
// PDF/A conversion and metadata reading with the PDF engines. Each result is
// checked for the fixture's text, not just its file type. Releases running
// with --chromium-deny-private-ips must also refuse to render a private address.
// Needs pdftotext and pdfinfo (poppler-utils).
// Usage: node .github/scripts/render-test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'render');
const PRIVATE_URL = 'http://169.254.169.254/latest/meta-data/';
// A screenshot of an empty page is about 2.7KB; the fixture renders to about 10KB.
const MIN_SCREENSHOT_BYTES = 5000;

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

const fixture = name => ({ name, data: fs.readFileSync(path.join(FIXTURES, name)) });

async function post(baseUrl, route, files, fields = {}) {
  const form = new FormData();
  for (const { name, data } of files) form.append('files', new Blob([data]), name);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
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

function poppler(tool, pdf, args = []) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'render-')), 'in.pdf');
  fs.writeFileSync(file, pdf);
  return execFileSync(tool, [...args, file, ...(tool === 'pdftotext' ? ['-'] : [])], { encoding: 'utf8' });
}

function expectPdf(pdf, markers, pages) {
  if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('response is not a PDF');
  const text = poppler('pdftotext', pdf);
  const missing = markers.filter(m => !text.includes(m));
  if (missing.length > 0) throw new Error(`PDF is missing ${missing.map(m => `"${m}"`).join(', ')}`);
  if (pages !== undefined) {
    const count = Number(poppler('pdfinfo', pdf).match(/^Pages:\s+(\d+)$/m)?.[1]);
    if (count !== pages) throw new Error(`PDF has ${count} pages, want ${pages}`);
  }
  return `${pdf.length} bytes`;
}

// Steps share results through `out`; a step whose input failed fails too.
const STEPS = [
  ['Chromium converts HTML (and runs its JavaScript)', async (api, out) => {
    out.chromium = await api('/forms/chromium/convert/html', [fixture('index.html')]);
    return expectPdf(out.chromium, ['Chromium render test', 'JavaScript render marker'], 1);
  }],
  ['LibreOffice converts a Word document', async (api, out) => {
    out.libreoffice = await api('/forms/libreoffice/convert', [fixture('document.docx')]);
    return expectPdf(out.libreoffice, ['LibreOffice render test'], 1);
  }],
  ['LibreOffice converts a spreadsheet (and evaluates its formula)', async api => {
    const pdf = await api('/forms/libreoffice/convert', [fixture('spreadsheet.xlsx')]);
    return expectPdf(pdf, ['Spreadsheet render test', '42']);
  }],
  ['Chromium takes a screenshot', async api => {
    const png = await api('/forms/chromium/screenshot/html', [fixture('index.html')]);
    if (!png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      throw new Error('response is not a PNG');
    }
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== 800 || height !== 600) throw new Error(`screenshot is ${width}x${height}, want 800x600`);
    if (png.length < MIN_SCREENSHOT_BYTES) throw new Error(`screenshot is ${png.length} bytes, looks blank`);
    return `${width}x${height}, ${png.length} bytes`;
  }],
  ['PDF engines merge two PDFs', async (api, out) => {
    out.merged = await api('/forms/pdfengines/merge', [
      { name: '1.pdf', data: out.chromium }, { name: '2.pdf', data: out.libreoffice },
    ]);
    return expectPdf(out.merged, ['Chromium render test', 'LibreOffice render test'], 2);
  }],
  ['PDF engines read metadata', async (api, out) => {
    const metadata = JSON.parse((await api('/forms/pdfengines/metadata/read', [{ name: 'merged.pdf', data: out.merged }])).toString());
    const pages = metadata['merged.pdf']?.PageCount;
    if (pages !== 2) throw new Error(`metadata PageCount is ${pages}, want 2`);
    return `PageCount ${pages}`;
  }],
  ['PDF engines convert to PDF/A-2b', async (api, out) => {
    const pdf = await api('/forms/pdfengines/convert', [{ name: 'in.pdf', data: out.libreoffice }], { pdfa: 'PDF/A-2b' });
    const xmp = poppler('pdfinfo', pdf, ['-meta']);
    if (!/<pdfaid:part>2<\/pdfaid:part>/.test(xmp)) throw new Error('PDF has no PDF/A-2 identification');
    return expectPdf(pdf, ['LibreOffice render test']);
  }],
];

async function main() {
  const releases = json('helm', ['list', '--all', '--all-namespaces', '--output', 'json'])
    .filter(r => r.chart.startsWith('gotenberg-'))
    .filter(r => {
      if (r.status === 'deployed') return true;
      console.log(`skip ${r.namespace}/${r.name}: ${r.status}`);
      return false;
    });
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
    const baseUrl = `http://127.0.0.1:${localPort}`;
    const api = (route, files, fields) => post(baseUrl, route, files, fields);

    try {
      const out = {};
      for (const [label, step] of STEPS) {
        try {
          console.log(`ok   ${namespace}/${name}: ${label}: ${await step(api, out)}`);
        } catch (e) {
          failures++;
          console.log(`FAIL ${namespace}/${name}: ${label}: ${e.message}`);
        }
      }

      if (args.includes('--chromium-deny-private-ips')) {
        const label = `Chromium refuses ${PRIVATE_URL}`;
        const form = new FormData();
        form.append('url', PRIVATE_URL);
        const response = await fetch(`${baseUrl}/forms/chromium/convert/url`, { method: 'POST', body: form });
        if (response.status === 403) {
          console.log(`ok   ${namespace}/${name}: ${label}`);
        } else {
          failures++;
          console.log(`FAIL ${namespace}/${name}: ${label}: got HTTP ${response.status}, want 403`);
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
