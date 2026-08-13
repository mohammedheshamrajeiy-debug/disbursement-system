import { INVENTORY_COLUMNS } from '../config.js';

export class InventoryService {
  constructor(dm) {
    this.dm = dm;
  }

  importFromExcelRows(rows, headers, storageId = null) {
    const colMap = {};
    for (const targetCol of INVENTORY_COLUMNS) {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (h && String(h).trim().toLowerCase() === targetCol.toLowerCase()) {
          colMap[targetCol] = i;
          break;
        }
      }
    }
    const items = [];
    for (const row of rows) {
      const item = {};
      for (const [targetCol, colIdx] of Object.entries(colMap)) {
        const val = row[colIdx];
        item[targetCol] = val === undefined || val === null ? '' : String(val).trim();
      }
      if (Object.values(item).some(Boolean)) items.push(item);
    }
    return this.dm.addInventoryItems(items, storageId);
  }

  search(query, storageId = null) {
    if (!String(query || '').trim()) return this.dm.getInventoryItems(storageId);
    return this.dm.searchInventory(query, storageId);
  }

  getFinancialSummary() {
    const totalInv = this.dm
      .getStorageIds()
      .reduce((s, sid) => s + this.dm.getInventoryItems(sid).length, 0);
    return {
      total_balance: this.dm.getTotalBalance(),
      total_original: this.dm.getTotalOriginalBalance(),
      total_deductions: this.dm.getTotalDeductions(),
      record_count: this.dm.getAllRecords().length,
      inventory_count: totalInv,
      storage_counts: this.dm.getStorageIds().map((sid) => ({
        id: sid,
        label: this.dm.getStorageLabel(sid),
        count: this.dm.getInventoryItems(sid).length,
      })),
    };
  }
}
