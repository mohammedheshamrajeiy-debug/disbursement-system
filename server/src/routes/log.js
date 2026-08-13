import { Router } from 'express';
import { exportData } from '../excel.js';

export function logRoutes(dm) {
  const router = Router();

  router.get('/', (req, res) => {
    const entries = dm.log.getRecent(200).map((e) => ({
      ...e,
      timestamp_display: String(e.timestamp).slice(0, 19).replace('T', ' '),
    }));
    res.json({ entries: entries.reverse() });
  });

  router.get('/summary', (req, res) => {
    res.json(dm.log.summary());
  });

  router.delete('/', (req, res) => {
    dm.log.clear();
    res.json({ ok: true });
  });

  router.get('/export', (req, res) => {
    const rows = [['#', 'الوقت', 'النوع', 'الوصف']];
    for (const e of [...dm.log.getRecent(500)].reverse()) {
      rows.push([e.id, String(e.timestamp).slice(0, 19).replace('T', ' '), e.type, e.description]);
    }
    const buffer = exportData(rows, 'سجل العمليات');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('transaction_log.xlsx')}`);
    res.send(buffer);
  });

  return router;
}
