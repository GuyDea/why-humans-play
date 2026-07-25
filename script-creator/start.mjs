#!/usr/bin/env node
// One-command Script Creator launcher: builds the UI when needed, starts the
// daemon, and opens the printed URL in the default browser.
//
//   node start.mjs [--rebuild] [--no-open] [--port <n>]

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, 'app');
const serverDir = join(here, 'server');
const distMarker = join(appDir, 'dist', 'app', 'browser', 'index.html');

const args = process.argv.slice(2);
const rebuild = args.includes('--rebuild');
const noOpen = args.includes('--no-open');
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? args[portIndex + 1] : null;

function newestMtime(root) {
  let newest = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      newest = Math.max(newest, newestMtime(path));
    } else {
      newest = Math.max(newest, statSync(path).mtimeMs);
    }
  }
  return newest;
}

const distStale = !existsSync(distMarker)
  || newestMtime(join(appDir, 'src')) > statSync(distMarker).mtimeMs;

if (rebuild || distStale) {
  console.log('Building the Script Creator UI…');
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: appDir,
    stdio: 'inherit',
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
} else {
  console.log('UI build is current — skipping (use --rebuild to force).');
}

const daemonArgs = ['--import', 'tsx', join('src', 'daemon.ts')];
if (port) daemonArgs.push('--port', port);
const daemon = spawn(process.execPath, daemonArgs, {
  cwd: serverDir,
  stdio: ['inherit', 'pipe', 'inherit'],
});

let opened = false;
daemon.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  const match = /listening at (http:\/\/127\.0\.0\.1:\d+\/#nonce=[a-f0-9]+)/.exec(text);
  if (match && !opened && !noOpen) {
    opened = true;
    const url = match[1];
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [url], { stdio: 'ignore', detached: true }).unref();
    console.log('Opened in your browser. Press Ctrl+C to stop.');
  }
});

const stop = () => daemon.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
daemon.on('exit', (code) => process.exit(code ?? 0));
