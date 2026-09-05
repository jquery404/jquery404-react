#!/usr/bin/env node
/**
 * Dev helper: ensure browser KB, start generate bridge + CRA.
 * Usage: npm run start:ai
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kbPath = path.join(root, 'public/assets/kb/browser_kb_v1.json');
const runtimePath = path.join(root, 'public/assets/kb/runtime.mjs');

if (!fs.existsSync(kbPath)) {
  console.log('[start:ai] Building browser KB artifact…');
  const r = spawnSync('npm', ['run', 'kb:browser', '--', '--skip-normalize'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
if (!fs.existsSync(runtimePath)) {
  console.log('[start:ai] Building browser KB runtime…');
  const r = spawnSync('npm', ['run', 'kb:browser:runtime'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function run(_name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      REACT_APP_AGENT_MODE: process.env.REACT_APP_AGENT_MODE || 'split',
    },
    shell: process.platform === 'win32',
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

const bridge = run('bridge', 'node', ['scripts/agent-bridge.mjs']);
const cra = run('cra', 'npm', ['start']);

function shutdown() {
  bridge.kill('SIGTERM');
  cra.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
