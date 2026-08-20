import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { INVENTORY_COLUMNS, INVENTORY_STORAGE_CUSTOMER } from '../config.js';
import { InventoryService } from '../services/inventoryService.js';
import { readWorkbook, getHeaderRow, extractAllRows, exportData } from '../excel.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function inventoryRoutes(dm) {
  const router = Router();
  const inventoryService = new InventoryService(dm);

  router.get('/', (req, res) => {
    const storageId = req.query.storage_id || null;
    const query = req.query.query || '';
    const sid = dm._normalizeStorageId(storageId);
    const items = inventoryService.search(query, sid).map((item) => ({ ...item }));
    res.json({
      storage_id: sid,
      label: dm.getStorageLabel(sid),
      items,
      counts: dm.getStorageIds().map((id) => ({
        id,
        label: dm.getStorageLabel(id),
        count: dm.getInventoryItems(id).length,
      })),
    });
  });

  router.get('/customer-items', (req, res) => {
    const items = dm.getInventoryItems(INVENTORY_STORAGE_CUSTOMER);
    res.json({ items, label: dm.getStorageLabel(INVENTORY_STORAGE_CUSTOMER) });
  });

  router.get('/carton', (req, res) => {
    const carton = String(req.query.carton || '').trim();
    const sid = dm._normalizeStorageId(req.query.storage_id || null);
    if (!carton) return res.json({ items: [] });
    const items = dm.findInventoryByCarton(carton, sid);
    res.json({ items, storage_id: sid, label: dm.getStorageLabel(sid) });
  });

  router.get('/summary', (req, res) => {
    res.json(inventoryService.getFinancialSummary());
  });

  router.get('/export', (req, res) => {
    const sid = dm._normalizeStorageId(req.query.storage_id || null);
    const label = dm.getStorageLabel(sid);
    const rows = [INVENTORY_COLUMNS];
    for (const item of dm.getInventoryItems(sid)) {
      rows.push(INVENTORY_COLUMNS.map((c) => item[c] || ''));
    }
    const buffer = exportData(rows, label);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`inventory_${sid}.xlsx`)}`);
    res.send(buffer);
  });

  router.post('/import', upload.single('file'), (req, res) => {
    const storageId = dm._normalizeStorageId(req.body.storage_id || null);
    let added = 0;
    let total = 0;

    if (req.file) {
      const wb = readWorkbook(req.file.buffer);
      const headers = getHeaderRow(wb);
      const rows = extractAllRows(wb).map((row) =>
        headers.map((h) => row[h] || ''),
      );
      total = rows.length;
      added = inventoryService.importFromExcelRows(rows, headers, storageId);
    } else if (req.body.rows && req.body.headers) {
      let rows = req.body.rows;
      if (typeof rows === 'string') rows = JSON.parse(rows);
      total = rows.length;
      added = inventoryService.importFromExcelRows(rows, req.body.headers, storageId);
    } else {
      return res.status(400).json({ error: req.t('errors.noFileOrRows') });
    }

    const label = dm.getStorageLabel(storageId);
    res.json({ added, total, storage_id: storageId, label });
  });

  router.post('/move-carton', (req, res) => {
    const moved = dm.moveCartonBetweenStorages(
      req.body.carton,
      req.body.from,
      req.body.to,
    );
    if (!moved) {
      return res.status(404).json({ error: req.t('errors.cartonNotFoundInStorage') });
    }
    res.json({
      moved,
      from: dm.getStorageLabel(req.body.from),
      to: dm.getStorageLabel(req.body.to),
    });
  });

  return router;
}
