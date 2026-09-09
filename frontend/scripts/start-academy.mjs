import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { get } from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const url = 'http://127.0.0.1:5173/learn';
function ready() {
  return new Promise(resolve => {
    const request = get(url, response => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(3000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}
if (!await ready()) {
  const output = openSync(new URL('../academy-server.log', import.meta.url), 'a');
  const errors = openSync(new URL('../academy-server-error.log', import.meta.url), 'a');
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: root, detached: true, windowsHide: true,
    stdio: ['ignore', output, errors],
  });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.unref();
  closeSync(output);
  closeSync(errors);
  for (let i = 0; i < 20 && !await ready(); i++) await new Promise(resolve => setTimeout(resolve, 500));
}
if (await ready()) console.log(`ChainLab ready: ${url}`);
else { console.error('Server could not start. See academy-server-error.log.'); process.exitCode = 1; }
