import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { readWorkbook, extractAllNumbers, exportData } from '../excel.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function financialRoutes(dm) {
  const router = Router();

  router.get('/', (req, res) => {
    const query = req.query.query || '';
    const records = (query ? dm.searchRecords(query) : dm.getAllRecords()).map((r) =>
      r.toJSON(),
    );
    res.json({ records });
  });

  router.get('/summary', (req, res) => {
    res.json({
      total_balance: dm.getTotalBalance(),
      total_original: dm.getTotalOriginalBalance(),
      total_deductions: dm.getTotalDeductions(),
      record_count: dm.getAllRecords().length,
    });
  });

  router.post('/', (req, res) => {
    const rec = dm.addRecord({
      label: req.body.label || '',
      value: Number(req.body.value) || 0,
      balance: req.body.balance !== undefined ? Number(req.body.balance) : Number(req.body.value) || 0,
      source_file: req.body.source_file || '',
      source_cell: req.body.source_cell || '',
      group_id: req.body.group_id || '',
    });
    res.json({ record: rec.toJSON() });
  });

  router.post('/import-excel', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: req.t('errors.noFile') });
    const wb = readWorkbook(req.file.buffer);
    const sheetName = req.body.sheet_name || null;
    const balanceCol = req.body.balance_column !== undefined && req.body.balance_column !== ''
      ? Number(req.body.balance_column)
      : null;
    const numbers = extractAllNumbers(wb, sheetName);
    const sourceFile = req.file.originalname;
    let count = 0;
    for (const item of numbers) {
      const label = `${path.basename(sourceFile)} - ${item.cell}`;
      dm.addRecord({
        label,
        value: item.value,
        balance: 0,
        source_file: sourceFile,
        source_cell: item.cell,
        autoSave: false,
      });
      count += 1;
    }
    dm.saveData();
    dm.log.logOperation('import_excel', `استيراد ${count} سجل من ${path.basename(sourceFile)}`);
    res.json({ count });
  });

  router.post('/:id/deduct', (req, res) => {
    const [success, message] = dm.deductFromRecord(req.params.id, Number(req.body.amount) || 0, req.t);
    if (!success) return res.status(400).json({ error: message });
    res.json({ message, record: dm.getRecord(req.params.id).toJSON() });
  });

  router.post('/:id/add', (req, res) => {
    const [success, message] = dm.addToBalance(req.params.id, Number(req.body.amount) || 0, req.t);
    if (!success) return res.status(400).json({ error: message });
    res.json({ message, record: dm.getRecord(req.params.id).toJSON() });
  });

  router.post('/:id/update-balance', (req, res) => {
    const [success, message] = dm.updateRecordBalance(req.params.id, Number(req.body.balance) || 0, req.t);
    if (!success) return res.status(400).json({ error: message });
    res.json({ message, record: dm.getRecord(req.params.id).toJSON() });
  });

  router.delete('/:id', (req, res) => {
    const [success, message] = dm.deleteRecord(req.params.id, req.t);
    if (!success) return res.status(400).json({ error: message });
    res.json({ message });
  });

  router.get('/export', (req, res) => {
    const rows = [
      ['المعرف', 'الاسم', 'القيمة', 'الرصيد الحالي', 'الرصيد الأصلي', 'المصادر', 'الخلية', 'المجموعة', 'تاريخ الإنشاء'],
    ];
    for (const r of dm.getAllRecords()) {
      rows.push([
        r.record_id,
        r.label,
        r.value,
        r.balance,
        r.original_balance,
        r.source_file,
        r.source_cell,
        r.group_id,
        r.created_at,
      ]);
    }
    const buffer = exportData(rows, 'السجلات المالية');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('financial_records.xlsx')}`);
    res.send(buffer);
  });

  return router;
}
