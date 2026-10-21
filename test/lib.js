// Helpers shared by the test scripts.

const path = require('path');
const { execFile, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHART = path.join(ROOT, 'charts', 'gotenberg');
const MAX_BUFFER = 64 * 1024 * 1024;

const text = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: MAX_BUFFER, ...options });
const json = (cmd, args) => JSON.parse(text(cmd, args));

// Runs a command and resolves with a transcript of it, or rejects with one.
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      const output = `$ ${cmd} ${args.join(' ')}\n${stdout}${stderr}`;
      if (error) reject(new Error(`${output}\n${error.message}`));
      else resolve(output);
    });
  });
}

// Kubernetes objects of a kind that belong to a Helm release.
const releaseObjects = (kind, namespace, release) => json('kubectl', [
  'get', kind, '-n', namespace, '-l', `app.kubernetes.io/instance=${release}`, '-o', 'json',
]).items;

module.exports = { ROOT, CHART, text, json, run, releaseObjects };
