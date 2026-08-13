import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './config.js';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(file, def = null) {
  try {
    if (!file || !fs.existsSync(file)) return def;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return def;
  }
}

export function writeJson(file, value) {
  if (!file) return;
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function pathExists(file) {
  return Boolean(file && fs.existsSync(file));
}

export function ensureDataDirs() {
  ensureDir(DATA_DIR);
  ensureDir(path.join(DATA_DIR, '..', 'uploads'));
}
