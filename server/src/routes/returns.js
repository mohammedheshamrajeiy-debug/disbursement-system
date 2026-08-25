import { Router } from 'express';
import { INVENTORY_STORAGE_RETURN, INVENTORY_COLUMNS, REQUEST_SOURCE_ALL, REQUEST_SOURCE_DISBURSEMENT } from '../config.js';
import { requireTab } from './auth.js';

export function returnRoutes(dm) {
  const router = Router();

  // Return requests are their own record now (R000001, ...), same idea as
  // طلب الصرف (D000001) — list/detail so they can be reviewed later. This
  // is read-only and available to anyone logged in (every non-devices tab
  // now shows a browse-only "المرتجعات" panel built on these two), same as
  // how RequestDetails already shows the returns banner on a request to
  // everyone. Only actually *processing* a return stays locked to 'devices'.
  router.get('/requests', (req, res) => {
    res.json({ requests: dm.listReturnRequests() });
  });

  router.get('/requests/:id', (req, res) => {
    const record = dm.getReturnRequest(String(req.params.id || '').trim());
    if (!record) return res.status(404).json({ error: req.t('errors.returnNotFound') });
    res.json({ request: record });
  });

  // Everything below this line is the actual "process a return" workflow,
  // so it stays restricted to whoever holds the 'devices' tab (موظف أجهزة,
  // plus مدير النظام who has every tab).
  router.use(requireTab('devices'));

  // Names of people who currently have at least one un-returned device on
  // record — used to power the name datalist in the المرتجع screen.
  // `source` (وكيل → 'disbursement', عميل → 'customer') narrows this to
  // only names that actually received something through that channel, so
  // picking وكيل doesn't surface a same-named عميل and vice versa.
  router.get('/names', (req, res) => {
    const source = String(req.query.source || REQUEST_SOURCE_ALL).trim();
    res.json({ names: dm.getCustomerDeviceNames(source) });
  });

  // Look up what a specific person actually received, either by carton
  // number (returns every device in that carton) or, if that doesn't match
  // anything, by a single device's own ID/serial number.
  router.get('/lookup', (req, res) => {
    const name = String(req.query.name || '').trim();
    const raw = String(req.query.carton || '').trim();
    const source = String(req.query.source || REQUEST_SOURCE_ALL).trim();
    if (!name || !raw) return res.json({ items: [] });

    let items = dm.findCustomerDevicesByCarton(name, raw, source);
    if (!items.length) {
      const single = dm.findCustomerDeviceBySerial(name, raw, source);
      if (single) items = [single];
    }
    res.json({ items });
  });

  // Commits a return — moves the scanned devices into مخزن المرتجع and
  // creates one standalone return request record (its own R-id), the same
  // way a طلب الصرف submission creates one D-request.
  //
  // Each device in `devices` is whatever the frontend already has for it:
  // if it matched something in the customer's dispatch record (via
  // /lookup) that's the full row (ID, serials, model, req_id, carton...);
  // if it was just scanned with no match found anywhere, it's only
  // `{ ID }` (the barcode itself) — that's fine, it doesn't need to exist
  // anywhere beforehand. Only devices that DO carry a req_id (i.e. actually
  // matched a dispatch record) get a return entry appended to their
  // original request and get cleared off the customer's device list;
  // ad-hoc devices just go straight into مخزن المرتجع under this name.
  router.post('/', (req, res) => {
    const name = String(req.body.name || '').trim();
    const notes = req.body.notes || '';
    const notesImage = req.body.notes_image || '';
    const devices = Array.isArray(req.body.devices) ? req.body.devices : [];
    // Which pool اسم المستفيد was searched against — recorded on the
    // return itself purely so the log/detail view can show whether this
    // was a وكيل or عميل return; doesn't affect how the return is filed.
    const beneficiaryType = String(req.body.source || '').trim() === REQUEST_SOURCE_DISBURSEMENT ? 'وكيل' : 'عميل';
    if (!name) {
      return res.status(400).json({ error: req.t('errors.enterName') });
    }
    if (!devices.length) {
      return res.status(400).json({ error: req.t('errors.addDevice') });
    }

    const seen = new Set();
    const clean = [];
    for (const raw of devices) {
      const id = String((raw && (raw.ID || raw.id)) || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const item = {};
      for (const col of INVENTORY_COLUMNS) item[col] = (raw && raw[col]) || '';
      item.ID = id;
      // البطاقة is the canonical home for a returned code: الريسيفر never
      // carries the returned device in مخزن المرتجع. A decoder serial with
      // no card on record moves into البطاقة; anything else gets the
      // scanned code itself.
      if (!item.CardSerialNo) {
        item.CardSerialNo = item.DecoderSerialNo || id;
      }
      item.DecoderSerialNo = '';
      clean.push({ ...item, req_id: (raw && raw.req_id) || '' });
    }
    if (!clean.length) {
      return res.status(400).json({ error: req.t('errors.noValidDevices') });
    }

    const returnReqId = dm.generateReturnRequestId();

    // Only devices that matched an actual dispatch record carry a req_id —
    // group those onto their originating request's returns[] list (this is
    // what powers the read-only banner seen from every other tab).
    const byReqId = new Map();
    for (const d of clean) {
      if (!d.req_id) continue;
      if (!byReqId.has(d.req_id)) byReqId.set(d.req_id, []);
      byReqId.get(d.req_id).push(d.ID);
    }
    const affectedRequests = [];
    for (const [reqId, deviceIds] of byReqId.entries()) {
      const updated = dm.addReturnToRequest(reqId, {
        device_ids: deviceIds,
        notes,
        notes_image: notesImage,
        return_req_id: returnReqId,
      });
      if (updated) affectedRequests.push(reqId);
    }

    // Insert into مخزن المرتجع, keeping just the normal inventory columns
    // plus the customer's name — مخزن المرتجع mixes devices from every
    // customer's returns into one flat list, so each row needs to say
    // whose device it was.
    const inventoryItems = clean.map(({ req_id, ...rest }) => ({ ...rest, CustomerName: name }));
    const added = dm.addInventoryItems(inventoryItems, INVENTORY_STORAGE_RETURN);

    dm.markCustomerDevicesReturned(name, clean.map((d) => d.ID));

    dm.addReturnRequest({
      req_id: returnReqId,
      name,
      beneficiary_type: beneficiaryType,
      notes,
      notes_image: notesImage,
      device_ids: clean.map((d) => d.ID),
      devices_data: inventoryItems,
      source_requests: affectedRequests,
      storage_id: INVENTORY_STORAGE_RETURN,
      status: 'مكتمل',
      created_at: new Date().toISOString(),
    });

    dm.log.logOperation(
      'return_devices',
      `مرتجع ${returnReqId}: إرجاع ${clean.length} جهاز من ${name} إلى ${dm.getStorageLabel(INVENTORY_STORAGE_RETURN)}`,
    );

    res.json({
      returned: clean.length,
      added_to_storage: added,
      affected_requests: affectedRequests,
      return_req_id: returnReqId,
      storage_label: dm.getStorageLabel(INVENTORY_STORAGE_RETURN),
    });
  });

  return router;
}
