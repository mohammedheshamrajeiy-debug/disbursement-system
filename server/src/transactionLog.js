import path from 'path';
import { DATA_DIR } from './config.js';
import { readJson, writeJson } from './store.js';

export class TransactionLog {
  constructor(dataDir = DATA_DIR) {
    this.logFile = path.join(dataDir, 'transaction_log.json');
    const data = readJson(this.logFile, []);
    this.entries = Array.isArray(data) ? data : [];
  }

  save() {
    writeJson(this.logFile, this.entries);
  }

  logOperation(type, description, details = {}) {
    const entry = {
      id: this.entries.length + 1,
      timestamp: new Date().toISOString(),
      type,
      description,
      details: details || {},
    };
    this.entries.push(entry);
    this.save();
    return entry;
  }

  getAll() {
    return [...this.entries];
  }

  getEntriesByType(opType) {
    return this.entries.filter((e) => e.type === opType);
  }

  getRecent(count = 200) {
    return this.entries.slice(-count);
  }

  clear() {
    this.entries = [];
    this.save();
  }

  summary() {
    const byType = {};
    for (const e of this.entries) byType[e.type] = (byType[e.type] || 0) + 1;
    return {
      total: this.entries.length,
      byType,
      first: this.entries[0] ? this.entries[0].timestamp : null,
      last: this.entries.length ? this.entries[this.entries.length - 1].timestamp : null,
    };
  }
}
