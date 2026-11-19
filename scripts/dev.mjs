import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const electron = require('electron');
const vite = await createServer({ server: { host: '127.0.0.1' } });
await vite.listen();
const address = vite.httpServer?.address();
if (!address || typeof address === 'string') throw new Error('Orbit could not start its local renderer.');
const profile = process.env.ORBIT_DATA_DIR || mkdtempSync(join(tmpdir(), 'orbit-dev-'));
process.stdout.write('Orbit development profile: ' + profile + '\n');
const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, ORBIT_DEV_URL: 'http://127.0.0.1:' + address.port, ORBIT_DATA_DIR: profile }
});
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', code => { process.exitCode = code || 0; resolve(undefined); });
}).finally(() => vite.close());
