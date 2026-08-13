import { Router } from 'express';
import { INVENTORY_STORAGE_DEFECT, INVENTORY_STORAGE_CUSTOMER, INVENTORY_COLUMNS } from '../config.js';
import { requireTab } from './auth.js';

export function defectRoutes(dm) {
  const router = Router();

  // Defect requests are their own record now (U000001, ...), same idea as
  // طلب الصرف (D000001) and المرتجع (R000001) — list/detail so they can be
  // reviewed later. This is read-only and available to anyone logged in
  // (every non-devices tab now shows a browse-only "العيب المصنعي" panel
  // built on these two), same as how RequestDetails already shows the
  // returns banner on a request to everyone. Only actually *processing* a
  // defect return stays locked to 'devices'.
  router.get('/requests', (req, res) => {
    res.json({ requests: dm.listDefectRequests() });
  });

  router.get('/requests/:id', (req, res) => {
    const record = dm.getDefectRequest(String(req.params.id || '').trim());
    if (!record) return res.status(404).json({ error: 'رقم عيب مصنعي غير موجود' });
    res.json({ request: record });
  });

  // Everything below this line is the actual "process a defect" workflow,
  // so it stays restricted to whoever holds the 'devices' tab (موظف أجهزة,
  // plus مدير النظام who has every tab).
  router.use(requireTab('devices'));

  // Names of people who currently have at least one un-returned device on
  // record — used to power the name datalist in the العيب المصنعي screen.
  router.get('/names', (req, res) => {
    res.json({ names: dm.getCustomerDeviceNames() });
  });

  // Look up what a specific person actually received, either by carton
  // number (returns every device in that carton) or, if that doesn't match
  // anything, by a single device's own ID/serial number.
  router.get('/lookup', (req, res) => {
    const name = String(req.query.name || '').trim();
    const raw = String(req.query.carton || '').trim();
    if (!name || !raw) return res.json({ items: [] });

    let items = dm.findCustomerDevicesByCarton(name, raw);
    if (!items.length) {
      const single = dm.findCustomerDeviceBySerial(name, raw);
      if (single) items = [single];
    }
    res.json({ items });
  });

  // Looks up a single device by serial inside مخزن خدمة العملاء only —
  // used by the replacement-device scan, since a replacement can only
  // come from that storage (it doesn't need to belong to this customer,
  // it just needs to physically exist there right now).
  router.get('/replacement-lookup', (req, res) => {
    const code = String(req.query.code || '').trim();
    if (!code) return res.json({ item: null });
    const items = dm.findInventoryBySerial(code, INVENTORY_STORAGE_CUSTOMER);
    res.json({ item: items[0] || null });
  });

  // Commits a defect return — moves the scanned devices into مخزن العيب
  // المصنعي and creates one standalone defect request record (its own
  // U-id), the same way a طلب الصرف submission creates one D-request.
  //
  // Each device in `devices` is whatever the frontend already has for it:
  // if it matched something in the customer's dispatch record (via
  // /lookup) that's the full row (ID, serials, model, req_id, carton...);
  // if it was just scanned with no match found anywhere, it's only
  // `{ ID }` (the barcode itself) — that's fine, it doesn't need to exist
  // anywhere beforehand. Only devices that DO carry a req_id (i.e. actually
  // matched a dispatch record) get a defect entry appended to their
  // original request and get cleared off the customer's device list;
  // ad-hoc devices just go straight into مخزن العيب المصنعي under this
  // name.
  router.post('/', (req, res) => {
    const name = String(req.body.name || '').trim();
    const notes = req.body.notes || '';
    const notesImage = req.body.notes_image || '';
    const defectType = String(req.body.defect_type || '').trim();
    const devices = Array.isArray(req.body.devices) ? req.body.devices : [];
    const replacements = Array.isArray(req.body.replacements) ? req.body.replacements : [];
    if (!name) {
      return res.status(400).json({ error: 'أدخل اسم المستفيد' });
    }
    if (!devices.length) {
      return res.status(400).json({ error: 'أضف جهازاً واحداً على الأقل' });
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
      if (!item.DecoderSerialNo) item.DecoderSerialNo = id;
      item.DefectType = defectType;
      clean.push({ ...item, req_id: (raw && raw.req_id) || '' });
    }
    if (!clean.length) {
      return res.status(400).json({ error: 'لم يتم تحديد أي جهاز صالح للإرجاع' });
    }

    const defectReqId = dm.generateDefectRequestId();

    // Only devices that matched an actual dispatch record carry a req_id —
    // group those onto their originating request's defects[] list (this is
    // what powers the read-only banner seen from every other tab).
    const byReqId = new Map();
    for (const d of clean) {
      if (!d.req_id) continue;
      if (!byReqId.has(d.req_id)) byReqId.set(d.req_id, []);
      byReqId.get(d.req_id).push(d.ID);
    }
    const affectedRequests = [];
    for (const [reqId, deviceIds] of byReqId.entries()) {
      const updated = dm.addDefectToRequest(reqId, {
        device_ids: deviceIds,
        notes,
        notes_image: notesImage,
        defect_req_id: defectReqId,
      });
      if (updated) affectedRequests.push(reqId);
    }

    // Insert into مخزن العيب المصنعي, keeping just the normal inventory
    // columns plus the customer's name — مخزن العيب المصنعي mixes devices
    // from every customer's defect returns into one flat list, so each row
    // needs to say whose device it was.
    const inventoryItems = clean.map(({ req_id, ...rest }) => ({ ...rest, CustomerName: name }));
    const added = dm.addInventoryItems(inventoryItems, INVENTORY_STORAGE_DEFECT);

    dm.markCustomerDevicesDefective(name, clean.map((d) => d.ID));

    // Replacement devices: whatever the frontend scanned from مخزن خدمة
    // العملاء to hand the customer in place of the broken ones. Each must
    // carry an ID (the /replacement-lookup match); dedupe defensively the
    // same way `clean` does above.
    const seenReplacement = new Set();
    const cleanReplacements = [];
    for (const raw of replacements) {
      const id = String((raw && (raw.ID || raw.id)) || '').trim();
      if (!id || seenReplacement.has(id)) continue;
      seenReplacement.add(id);
      const item = {};
      for (const col of INVENTORY_COLUMNS) item[col] = (raw && raw[col]) || '';
      item.ID = id;
      cleanReplacements.push(item);
    }

    let replacedCount = 0;
    if (cleanReplacements.length) {
      replacedCount = dm.removeInventoryItems(cleanReplacements, INVENTORY_STORAGE_CUSTOMER);
      dm.recordCustomerDevices(name, cleanReplacements, { req_id: defectReqId });
    }

    dm.addDefectRequest({
      req_id: defectReqId,
      name,
      notes,
      notes_image: notesImage,
      device_ids: clean.map((d) => d.ID),
      devices_data: inventoryItems,
      replacement_device_ids: cleanReplacements.map((d) => d.ID),
      replacements_data: cleanReplacements,
      source_requests: affectedRequests,
      storage_id: INVENTORY_STORAGE_DEFECT,
      status: 'مكتمل',
      created_at: new Date().toISOString(),
    });

    dm.log.logOperation(
      'defect_devices',
      `عيب مصنعي ${defectReqId}: إرجاع ${clean.length} جهاز من ${name} إلى ${dm.getStorageLabel(INVENTORY_STORAGE_DEFECT)}` +
        (cleanReplacements.length
          ? ` | استبدال ${cleanReplacements.length} جهاز من ${dm.getStorageLabel(INVENTORY_STORAGE_CUSTOMER)}`
          : ''),
    );

    res.json({
      returned: clean.length,
      added_to_storage: added,
      replaced: cleanReplacements.length,
      replaced_from_storage: replacedCount,
      affected_requests: affectedRequests,
      defect_req_id: defectReqId,
      storage_label: dm.getStorageLabel(INVENTORY_STORAGE_DEFECT),
    });
  });

  return router;
}
