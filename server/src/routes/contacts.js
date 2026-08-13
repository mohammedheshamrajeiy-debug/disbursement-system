import { Router } from 'express';
import { REQUEST_SOURCE_DISBURSEMENT, REQUEST_SOURCE_CUSTOMER, REQUEST_SOURCE_ALL } from '../config.js';

function normalizeSource(v, def) {
  return [REQUEST_SOURCE_DISBURSEMENT, REQUEST_SOURCE_CUSTOMER, REQUEST_SOURCE_ALL].includes(v)
    ? v
    : def;
}

export function contactRoutes(dm) {
  const router = Router();

  router.get('/', (req, res) => {
    const source = normalizeSource(req.query.source, REQUEST_SOURCE_DISBURSEMENT);
    if (source === REQUEST_SOURCE_CUSTOMER) {
      res.json({ contacts: Object.values(dm.customers), source });
    } else if (source === REQUEST_SOURCE_DISBURSEMENT) {
      res.json({ contacts: Object.values(dm.beneficiaries), source });
    } else {
      res.json({
        contacts: Object.values(dm.beneficiaries).concat(Object.values(dm.customers)),
        source,
      });
    }
  });

  router.post('/', (req, res) => {
    const source = normalizeSource(req.body.source, REQUEST_SOURCE_DISBURSEMENT);
    dm.upsertContact({
      name: req.body.name,
      phone: req.body.phone,
      region: req.body.region,
      receiver: req.body.receiver,
      beneficiary_type: req.body.beneficiary_type,
      source,
    });
    res.json({ ok: true });
  });

  router.delete('/', (req, res) => {
    const source = normalizeSource(req.query.source, REQUEST_SOURCE_DISBURSEMENT);
    const ok = dm.deleteContact(req.query.name || '', source);
    if (!ok) return res.status(404).json({ error: 'لم يتم العثور على المستخدم' });
    res.json({ ok: true });
  });

  return router;
}
