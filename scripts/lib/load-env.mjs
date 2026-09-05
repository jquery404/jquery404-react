/**
 * Load .env into process.env without committing secrets.
 * Does not override already-set environment variables.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './kb-normalize.mjs';

export function loadEnvFile(filePath = path.join(REPO_ROOT, '.env')) {
  if (!fs.existsSync(filePath)) return { loaded: false, path: filePath };
  const raw = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
      count += 1;
    }
  }
  return { loaded: true, path: filePath, keysSet: count };
}
