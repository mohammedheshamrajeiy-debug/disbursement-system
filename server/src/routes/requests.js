import { Router } from 'express';
import * as XLSX from 'xlsx';
import {
  REQUEST_SOURCE_ALL,
  REQUEST_SOURCE_DISBURSEMENT,
  REQUEST_SOURCE_CUSTOMER,
} from '../config.js';
import {
  RequestService,
  getRequestDisplayData,
  collectDevicesData,
  getInvoiceNumber,
  parseReqId,
} from '../services/requestService.js';
import { DeviceService } from '../services/deviceService.js';
import { ActivationService } from '../services/activationService.js';
import { attachInvoice, attachShipment, attachHandDelivery } from '../workflow.js';
import { exportData } from '../excel.js';

function normalizeSources() {
  const valid = [REQUEST_SOURCE_ALL, REQUEST_SOURCE_DISBURSEMENT, REQUEST_SOURCE_CUSTOMER];
  return (v, def) => (valid.includes(v) ? v : def);
}

export function requestRoutes(dm) {
  const router = Router();
  const reqService = new RequestService(dm);
  const deviceService = new DeviceService(dm);
  const activationService = new ActivationService(dm);
  const src = normalizeSources();

  router.get('/', (req, res) => {
    const source = src(req.query.source, REQUEST_SOURCE_ALL);
    const list = dm.iterRequests(source).map(([rid, r]) => ({
      req_id: rid,
      display: getRequestDisplayData(rid, dm.normalizeImages(r)),
      raw: dm.normalizeImages(r),
    }));
    res.json(list);
  });

  router.get('/labels', (req, res) => {
    const source = src(req.query.source, REQUEST_SOURCE_ALL);
    const stage = req.query.stage || null;
    const completed = req.query.completed === '1' || req.query.completed === 'true';
    res.json({
      labels: completed
        ? reqService.listLabelsForEditing(stage, source)
        : reqService.listLabelsForWorkflow(stage, source),
    });
  });

  router.get('/history', (req, res) => {
    const source = src(req.query.source, REQUEST_SOURCE_DISBURSEMENT);
    const name = req.query.name || '';
    res.json({ history: dm.getBeneficiaryHistory(name, source) });
  });

  router.get('/next-id', (req, res) => {
    const source = src(req.query.source, REQUEST_SOURCE_DISBURSEMENT);
    res.json({
      req_id:
        source === REQUEST_SOURCE_CUSTOMER
          ? reqService.generateCustomerId()
          : reqService.generateDisbursementId(),
    });
  });

  router.get('/names', (req, res) => {
    const source = src(req.query.source, REQUEST_SOURCE_ALL);
    const names = new Set();
    for (const [, r] of dm.iterRequests(source)) {
      const n = String(r.name || '').trim();
      if (n) names.add(n);
    }
    const contactsStore =
      source === REQUEST_SOURCE_CUSTOMER
        ? dm.customers
        : source === REQUEST_SOURCE_DISBURSEMENT
          ? dm.beneficiaries
          : null;
    if (contactsStore) {
      for (const entry of Object.values(contactsStore)) {
        const n = String(entry.name || '').trim();
        if (n) names.add(n);
      }
    }
    res.json({ names: [...names].sort((a, b) => a.localeCompare(b, 'ar')) });
  });

  router.post('/', (req, res) => {
    const source = src(req.body.source, REQUEST_SOURCE_DISBURSEMENT);
    try {
      const reqId = reqService.createRequest(req.body, source);
      const found = dm.findRequest(reqId);
      res.json({ req_id: reqId, req: dm.normalizeImages(found[1]) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/:id', (req, res) => {
    const found = dm.findRequest(req.params.id);
    if (!found) return res.status(404).json({ error: 'طلب الصرف غير موجود' });
    const r = dm.normalizeImages(found[1]);
    res.json({ req_id: req.params.id, req: r, display: getRequestDisplayData(req.params.id, r) });
  });

  router.get('/:id/devices.xlsx', (req, res) => {
    const found = dm.findRequest(req.params.id);
    if (!found) return res.status(404).json({ error: 'طلب الصرف غير موجود' });
    const r = found[1];
    const activationMap = r.activation_data || {};
    const devices = collectDevicesData(r).filter((d) => !d.returned);
    const beneficiaryName = r.name || '';
    const invoiceNumber = getInvoiceNumber(r) || '';
    const rows = [
      [
        'id',
        'الكرتونة',
        'رقم التسلسل',
        'الشريحة',
        'الكارت',
        'الأسم',
        'رقم الفاتورة',
        'المدة',
        'SKU',
        'الموديل',
        'التحميل',
      ],
      ...devices.map((d) => [
        d.ID || d.id || '',
        d.CartonSerialNo || '',
        d.DecoderSerialNo || d.id || d.ID || '',
        d.ChipSerialNo || '',
        d.CardSerialNo || '',
        beneficiaryName,
        invoiceNumber,
        d.duration || '',
        d.sku || '',
        d.Model_name || '',
        activationMap[String(d.DecoderSerialNo || d.id || d.ID || '')] ? 'محمل' : 'غير محمل',
      ]),
    ];
    const buffer = exportData(rows, 'الأجهزة');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`devices_${req.params.id}.xlsx`)}`);
    res.send(buffer);
  });

  router.post('/:id/invoice', (req, res) => {
    const found = dm.findRequest(req.params.id);
    if (!found) return res.status(404).json({ error: 'طلب الصرف غير موجود' });
    const r = found[1];
    r.request_id = req.params.id;
    attachInvoice(r, {
      invoice_id: req.body.invoice_id || '',
      images: req.body.images || [],
      amount: Number(req.body.amount) || 0,
      sale_order: req.body.sale_order || '',
      invoice_date: req.body.invoice_date || '',
      accountant_image: req.body.accountant_image || '',
    });
    dm.saveRequest(req.params.id);
    dm.log.logOperation(
      'add_invoice',
      `إضافة فاتورة ${r.invoice_id} للطلب ${r.request_id}`,
    );
    res.json({ req: dm.normalizeImages(r) });
  });

  router.post('/:id/shipment', (req, res) => {
    const found = dm.findRequest(req.params.id);
    if (!found) return res.status(404).json({ error: 'طلب الصرف غير موجود' });
    const r = found[1];
    r.request_id = req.params.id;
    attachShipment(r, {
      bol_number: req.body.bol_number || '',
      carrier: req.body.carrier || '',
      image: req.body.image || '',
      shipment_date: req.body.shipment_date || '',
    });
    dm.saveRequest(req.params.id);
    dm.log.logOperation(
      'add_shipment',
      `إضافة بوليصة ${r.shipment_id} للطلب ${r.request_id}`,
    );
    res.json({ req: dm.normalizeImages(r) });
  });

  router.post('/:id/hand-delivery', (req, res) => {
    const found = dm.findRequest(req.params.id);
    if (!found) return res.status(404).json({ error: 'طلب الصرف غير موجود' });
    const r = found[1];
    r.request_id = req.params.id;
    attachHandDelivery(r, {
      delivery_date: req.body.delivery_date || '',
      receiver: req.body.receiver || '',
      notes: req.body.notes || '',
      image: req.body.image || '',
    });
    dm.saveRequest(req.params.id);
    dm.log.logOperation('hand_delivery', `استلام يدوي للطلب ${r.request_id}`);
    res.json({ req: dm.normalizeImages(r) });
  });

  router.post('/:id/devices', (req, res) => {
    const reqId = parseReqId(req.params.id);
    try {
      const [, summary] = deviceService.saveDevicesAndInventory(
        reqId,
        req.body.devices_data || [],
        req.body.storage_id || null,
      );
      const found = dm.findRequest(reqId);
      res.json({ summary, req: dm.normalizeImages(found[1]) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/:id/return-devices', (req, res) => {
    const reqId = parseReqId(req.params.id);
    try {
      const [, summary] = deviceService.returnDevices(
        reqId,
        req.body.device_ids || [],
        req.body.notes || '',
      );
      const found = dm.findRequest(reqId);
      res.json({ summary, req: dm.normalizeImages(found[1]) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/customers/:name/devices', (req, res) => {
    const file = dm.getCustomerDevicesFile(req.params.name);
    if (!file) return res.status(404).json({ error: 'لا توجد بيانات أجهزة لهذا العميل' });
    res.json(file);
  });

  router.post('/:id/financial-deduct', (req, res) => {
    const reqId = parseReqId(req.params.id);
    try {
      const [, summary] = deviceService.deductFinancialBalance(reqId, req.body.devices_data || null);
      const found = dm.findRequest(reqId);
      res.json({ summary, req: dm.normalizeImages(found[1]) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/:id/confirm-dispatch', (req, res) => {
    const reqId = parseReqId(req.params.id);
    const found = dm.findRequest(reqId);
    if (!found) return res.status(404).json({ error: 'طلب الصرف غير موجود' });
    try {
      const r = found[1];
      const summaries = [];
      const devicesData = req.body.devices_data || [];
      if (devicesData.length) {
        const [, summary] = deviceService.saveDevicesAndInventory(
          reqId,
          devicesData,
          req.body.storage_id || null,
        );
        summaries.push(summary);
      } else if (!r.devices_confirmed) {
        return res.status(400).json({ error: 'لا توجد أرقام أجهزة في الجدولين' });
      }
      const updated = dm.getRequest(reqId);
      if (!updated.financial_deducted) {
        try {
          const [, summary] = deviceService.deductFinancialBalance(reqId, devicesData.length ? devicesData : null);
          summaries.push(summary);
        } catch (e) {
          if (!summaries.length) return res.status(400).json({ error: e.message });
          summaries.push(e.message);
        }
      } else if (!summaries.length) {
        return res.status(400).json({ error: 'تم حفظ الأجهزة وخصم الرصيد مسبقاً لهذا الطلب' });
      }
      const finalReq = dm.normalizeImages(dm.getRequest(reqId));
      res.json({ summary: summaries.join('\n\n'), req: finalReq });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/:id/activation', (req, res) => {
    const reqId = parseReqId(req.params.id);
    try {
      const r = activationService.activateDevice(
        reqId,
        req.body.serial,
        req.body.date || '',
        req.body.notes || '',
      );
      const [activated, total] = activationService.activationProgress(r);
      res.json({ req: dm.normalizeImages(r), progress: { activated, total } });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/:id/activation-all', (req, res) => {
    const reqId = parseReqId(req.params.id);
    try {
      const [count, r] = activationService.activateAll(
        reqId,
        req.body.date || '',
        req.body.notes || 'تحميل شامل',
      );
      const [activated, total] = activationService.activationProgress(r);
      res.json({ count, req: dm.normalizeImages(r), progress: { activated, total } });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}
