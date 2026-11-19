import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { packager } from '@electron/packager';

const dir = process.cwd();
const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
const bundles = await packager({
  dir, name: 'Orbit', platform: 'win32', arch: process.arch,
  electronVersion: manifest.devDependencies.electron,
  out: join(dir, 'release'), asar: true, overwrite: true, prune: false,
  ignore: [/^\/(?:node_modules|release|docs|tasks|test|scripts|\.scratch|\.impeccable|\.codex|\.workspace-data)(?:\/|$)/],
});
for (const bundle of bundles) process.stdout.write(join(bundle, 'Orbit.exe') + '\n');
