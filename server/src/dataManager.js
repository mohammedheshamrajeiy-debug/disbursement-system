import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  DATA_DIR,
  UPLOADS_DIR,
  DEFAULT_USERS,
  DEFAULT_INVENTORY_STORAGE,
  INVENTORY_STORAGE_IDS,
  INVENTORY_STORAGE_LABELS,
  REQUEST_SOURCE_DISBURSEMENT,
  REQUEST_SOURCE_CUSTOMER,
  REQUEST_SOURCE_ALL,
} from './config.js';
import { TransactionLog } from './transactionLog.js';
import { readJson, writeJson, ensureDir } from './store.js';

export function inferRequestSource(reqId) {
  if (typeof reqId === 'string' && /^C\d+$/.test(reqId)) return REQUEST_SOURCE_CUSTOMER;
  return REQUEST_SOURCE_DISBURSEMENT;
}

export function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

export function storageKey(name) {
  return normalizeName(name).replace(/ /g, '_');
}

export class FinancialRecord {
  constructor(data = {}) {
    this.record_id = data.record_id;
    this.label = data.label || '';
    this.value = data.value ?? 0;
    this.balance = data.balance ?? 0;
    this.original_balance = data.original_balance ?? data.balance ?? 0;
    this.source_file = data.source_file || '';
    this.source_cell = data.source_cell || '';
    this.group_id = data.group_id || '';
    const now = new Date().toISOString();
    this.created_at = data.created_at || now;
    this.updated_at = data.updated_at || now;
  }

  deduct(amount) {
    if (!(amount > 0)) return [false, 'مبلغ الخصم يجب أن يكون أكبر من صفر'];
    if (amount > this.balance)
      return [false, `الرصيد غير كافٍ. الرصيد الحالي: ${this.balance}`];
    this.balance -= amount;
    this.updated_at = new Date().toISOString();
    return [true, `تم خصم ${amount} بنجاح. الرصيد المتبقي: ${this.balance}`];
  }

  addToBalance(amount) {
    if (!(amount > 0)) return [false, 'المبلغ يجب أن يكون أكبر من صفر'];
    this.balance += amount;
    this.updated_at = new Date().toISOString();
    return [true, `تمت إضافة ${amount}. الرصيد الجديد: ${this.balance}`];
  }

  toJSON() {
    return {
      record_id: this.record_id,
      label: this.label,
      value: this.value,
      balance: this.balance,
      original_balance: this.original_balance,
      source_file: this.source_file,
      source_cell: this.source_cell,
      group_id: this.group_id,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static fromJSON(data) {
    return new FinancialRecord(data);
  }
}

export class DataManager {
  constructor(dataDir = DATA_DIR) {
    this.dataDir = dataDir;
    ensureDir(dataDir);

    this.dataFile = path.join(dataDir, 'financial_data.json');
    this.disbursementRequestsFile = path.join(dataDir, 'disbursement_requests.json');
    this.customerRequestsFile = path.join(dataDir, 'customer_requests.json');
    this.returnRequestsFile = path.join(dataDir, 'return_requests.json');
    this.defectRequestsFile = path.join(dataDir, 'defect_requests.json');
    this.beneficiariesFile = path.join(dataDir, 'beneficiaries.json');
    this.customersFile = path.join(dataDir, 'customers.json');
    this.usersFile = path.join(dataDir, 'users.json');
    this.inventoryFile = path.join(dataDir, 'inventory.json');
    this.customerDevicesFile = path.join(dataDir, 'customer_devices.json');

    this.records = {};
    this.groups = {};
    this.disbursementRequests = {};
    this.customerRequests = {};
    this.returnRequests = {};
    this.defectRequests = {};
    this.beneficiaries = {};
    this.customers = {};
    this.inventoryStorages = {};
    this.customerDevices = {};
    this.inventoryStorageLabels = { ...INVENTORY_STORAGE_LABELS };
    for (const sid of INVENTORY_STORAGE_IDS) this.inventoryStorages[sid] = [];
    this.serialCache = {};
    this.log = new TransactionLog(dataDir);

    this.loadData();
    this.loadRequests();
    this.loadContacts();
    this.loadInventory();
    this.loadCustomerDevices();
    this.loadUsers();
    this.rebuildSerialCache();
  }

  // ============ financial records ============
  rebuildSerialCache() {
    const cache = {};
    for (const rec of Object.values(this.records)) {
      const serial = Number.isInteger(rec.value)
        ? String(rec.value)
        : String(rec.value);
      cache[serial] = rec.record_id;
    }
    this.serialCache = cache;
  }

  loadData() {
    const data = readJson(this.dataFile, {});
    if (!data || typeof data !== 'object') return;
    this.records = {};
    for (const recData of data.records || []) {
      const rec = FinancialRecord.fromJSON(recData);
      this.records[rec.record_id] = rec;
    }
    this.groups = data.groups || {};
  }

  saveData() {
    writeJson(this.dataFile, {
      records: Object.values(this.records).map((r) => r.toJSON()),
      groups: this.groups,
      last_updated: new Date().toISOString(),
    });
    this.rebuildSerialCache();
  }

  addRecord({ label, value, balance, source_file = '', source_cell = '', group_id = '', autoSave = true }) {
    const recordId = crypto.randomBytes(4).toString('hex').slice(0, 8);
    const rec = new FinancialRecord({
      record_id: recordId,
      label,
      value,
      balance,
      source_file,
      source_cell,
      group_id,
    });
    this.records[recordId] = rec;
    if (autoSave) this.saveData();
    return rec;
  }

  deductFromRecord(recordId, amount) {
    const rec = this.records[recordId];
    if (!rec) return [false, `السجل غير موجود: ${recordId}`];
    const oldBalance = rec.balance;
    const [success, message] = rec.deduct(amount);
    if (success) {
      this.saveData();
      this.log.logOperation(
        'deduct',
        `خصم من [${rec.label}]: ${amount} | الرصيد: ${oldBalance} -> ${rec.balance}`,
      );
    }
    return [success, message];
  }

  addToBalance(recordId, amount) {
    const rec = this.records[recordId];
    if (!rec) return [false, `السجل غير موجود: ${recordId}`];
    const oldBalance = rec.balance;
    const [success, message] = rec.addToBalance(amount);
    if (success) {
      this.saveData();
      this.log.logOperation(
        'add_balance',
        `إضافة لرصيد [${rec.label}]: ${amount} | الرصيد: ${oldBalance} -> ${rec.balance}`,
      );
    }
    return [success, message];
  }

  updateRecordBalance(recordId, newBalance) {
    const rec = this.records[recordId];
    if (!rec) return [false, 'السجل غير موجود'];
    const oldBalance = rec.balance;
    rec.balance = newBalance;
    rec.updated_at = new Date().toISOString();
    this.saveData();
    this.log.logOperation(
      'update_balance',
      `تحديث رصيد [${rec.label}]: ${oldBalance} -> ${newBalance}`,
    );
    return [true, `تم تحديث الرصيد إلى ${newBalance}`];
  }

  deleteRecord(recordId) {
    const rec = this.records[recordId];
    if (!rec) return [false, 'السجل غير موجود'];
    delete this.records[recordId];
    this.saveData();
    this.log.logOperation('delete_record', `حذف سجل: ${rec.label}`);
    return [true, `تم حذف السجل: ${rec.label}`];
  }

  createGroup(name, description = '') {
    const groupId = crypto.randomBytes(4).toString('hex').slice(0, 8);
    this.groups[groupId] = {
      group_id: groupId,
      name,
      description,
      created_at: new Date().toISOString(),
    };
    this.saveData();
    this.log.logOperation('create_group', `إنشاء مجموعة: ${name}`);
    return groupId;
  }

  findRecordBySerial(serial) {
    const rid = this.serialCache[String(serial)];
    return rid ? this.records[rid] : null;
  }

  getTotalBalance() {
    return Object.values(this.records).reduce((s, r) => s + r.balance, 0);
  }

  getTotalOriginalBalance() {
    return Object.values(this.records).reduce((s, r) => s + r.original_balance, 0);
  }

  getTotalDeductions() {
    return Object.values(this.records).reduce(
      (s, r) => s + (r.original_balance - r.balance),
      0,
    );
  }

  getAllRecords() {
    return Object.values(this.records);
  }

  getRecord(recordId) {
    return this.records[recordId] || null;
  }

  searchRecords(query) {
    const q = String(query || '').toLowerCase();
    return Object.values(this.records).filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.record_id.toLowerCase().includes(q),
    );
  }

  // ============ requests ============
  _readRequestsFile(file) {
    const data = readJson(file, null);
    if (!data || typeof data !== 'object') return {};
    if (data.requests && typeof data.requests === 'object') return data.requests;
    if (Object.keys(data).some((k) => /^[RCU]/.test(k))) return data;
    return {};
  }

  _writeRequestsFile(file, store) {
    writeJson(file, {
      requests: store,
      last_updated: new Date().toISOString(),
    });
  }

  loadRequests() {
    this.disbursementRequests = this._readRequestsFile(this.disbursementRequestsFile);
    this.customerRequests = this._readRequestsFile(this.customerRequestsFile);
    this.returnRequests = this._readRequestsFile(this.returnRequestsFile);
    this.defectRequests = this._readRequestsFile(this.defectRequestsFile);
  }

  saveDisbursementRequests() {
    this._writeRequestsFile(this.disbursementRequestsFile, this.disbursementRequests);
  }

  saveCustomerRequests() {
    this._writeRequestsFile(this.customerRequestsFile, this.customerRequests);
  }

  saveReturnRequests() {
    this._writeRequestsFile(this.returnRequestsFile, this.returnRequests);
  }

  // Return requests get their own R-prefixed id (R000001, ...), the same
  // way disbursement (D000001) and customer (C00001) requests do — see
  // generateDisbursementId/generateCustomerId in requestService.js, which
  // this mirrors, just kept local since the returns route only holds a
  // reference to the DataManager, not the RequestService.
  generateReturnRequestId() {
    let maxNum = 0;
    for (const rid of Object.keys(this.returnRequests)) {
      const rest = rid.slice(1);
      if (rid.startsWith('R') && /^\d+$/.test(rest)) {
        maxNum = Math.max(maxNum, parseInt(rest, 10));
      }
    }
    return `R${String(maxNum + 1).padStart(6, '0')}`;
  }

  addReturnRequest(record) {
    this.returnRequests[record.req_id] = record;
    this.saveReturnRequests();
    return record;
  }

  getReturnRequest(reqId) {
    return this.returnRequests[reqId] || null;
  }

  listReturnRequests() {
    return Object.keys(this.returnRequests)
      .sort()
      .reverse()
      .map((rid) => this.returnRequests[rid]);
  }

  saveDefectRequests() {
    this._writeRequestsFile(this.defectRequestsFile, this.defectRequests);
  }

  // Defect requests (العيب المصنعي) mirror return requests exactly, just
  // with their own U-prefixed id (U000001, ...) and their own storage/file,
  // so they never collide with or get mixed into the R-prefixed returns.
  generateDefectRequestId() {
    let maxNum = 0;
    for (const rid of Object.keys(this.defectRequests)) {
      const rest = rid.slice(1);
      if (rid.startsWith('U') && /^\d+$/.test(rest)) {
        maxNum = Math.max(maxNum, parseInt(rest, 10));
      }
    }
    return `U${String(maxNum + 1).padStart(6, '0')}`;
  }

  addDefectRequest(record) {
    this.defectRequests[record.req_id] = record;
    this.saveDefectRequests();
    return record;
  }

  getDefectRequest(reqId) {
    return this.defectRequests[reqId] || null;
  }

  listDefectRequests() {
    return Object.keys(this.defectRequests)
      .sort()
      .reverse()
      .map((rid) => this.defectRequests[rid]);
  }

  saveRequest(reqId) {
    if (reqId in this.disbursementRequests) this.saveDisbursementRequests();
    else if (reqId in this.customerRequests) this.saveCustomerRequests();
    else {
      this.saveDisbursementRequests();
      this.saveCustomerRequests();
    }
  }

  getRequestStore(source) {
    return source === REQUEST_SOURCE_CUSTOMER
      ? this.customerRequests
      : this.disbursementRequests;
  }

  requestExists(reqId) {
    return reqId in this.disbursementRequests || reqId in this.customerRequests;
  }

  getRequest(reqId) {
    if (reqId in this.disbursementRequests) return this.disbursementRequests[reqId];
    if (reqId in this.customerRequests) return this.customerRequests[reqId];
    return null;
  }

  findRequest(reqId) {
    if (reqId in this.disbursementRequests)
      return [REQUEST_SOURCE_DISBURSEMENT, this.disbursementRequests[reqId]];
    if (reqId in this.customerRequests)
      return [REQUEST_SOURCE_CUSTOMER, this.customerRequests[reqId]];
    return null;
  }

  // Appends a return entry onto the original request that dispatched these
  // devices, and marks the matching rows in devices_data as returned — this
  // is what makes a return visible from الطلبات المحفوظة without needing a
  // separate "return records" list.
  addReturnToRequest(reqId, { carton_no, device_ids, notes = '', notes_image = '', return_req_id = '' }) {
    const found = this.findRequest(reqId);
    if (!found) return null;
    const req = found[1];
    const idSet = new Set(device_ids);
    req.returns = req.returns || [];
    req.returns.push({
      return_req_id: return_req_id || '',
      carton_no: carton_no || '',
      device_ids: [...device_ids],
      notes,
      notes_image,
      date: new Date().toISOString(),
    });
    req.devices_data = (req.devices_data || []).map((d) =>
      idSet.has(d.ID) ? { ...d, returned: true, returned_at: new Date().toISOString() } : d,
    );
    this.saveRequest(reqId);
    return req;
  }

  // Same idea as addReturnToRequest, but appends onto the request's
  // `defects` array and flags devices with `defective` instead of
  // `returned` — so a منتج مصنعي معيب shows up next to the returns banner
  // without being confused with an actual return.
  addDefectToRequest(reqId, { carton_no, device_ids, notes = '', notes_image = '', defect_req_id = '' }) {
    const found = this.findRequest(reqId);
    if (!found) return null;
    const req = found[1];
    const idSet = new Set(device_ids);
    req.defects = req.defects || [];
    req.defects.push({
      defect_req_id: defect_req_id || '',
      carton_no: carton_no || '',
      device_ids: [...device_ids],
      notes,
      notes_image,
      date: new Date().toISOString(),
    });
    req.devices_data = (req.devices_data || []).map((d) =>
      idSet.has(d.ID) ? { ...d, defective: true, defective_at: new Date().toISOString() } : d,
    );
    this.saveRequest(reqId);
    return req;
  }

  setRequest(reqId, data, source = null) {
    if (!source) {
      source = inferRequestSource(reqId);
      if (data.beneficiary_type === 'عميل') source = REQUEST_SOURCE_CUSTOMER;
    }
    this.getRequestStore(source)[reqId] = data;
  }

  iterAllRequests() {
    const keys = Object.keys(this.disbursementRequests)
      .concat(Object.keys(this.customerRequests))
      .sort();
    const out = [];
    for (const rid of Object.keys(this.disbursementRequests).sort())
      out.push([rid, this.disbursementRequests[rid]]);
    for (const rid of Object.keys(this.customerRequests).sort())
      out.push([rid, this.customerRequests[rid]]);
    return out;
  }

  iterRequests(source = REQUEST_SOURCE_ALL) {
    if (source === REQUEST_SOURCE_DISBURSEMENT)
      return Object.keys(this.disbursementRequests)
        .sort()
        .map((rid) => [rid, this.disbursementRequests[rid]]);
    if (source === REQUEST_SOURCE_CUSTOMER)
      return Object.keys(this.customerRequests)
        .sort()
        .map((rid) => [rid, this.customerRequests[rid]]);
    return this.iterAllRequests();
  }

  getBeneficiaryHistory(name, source = REQUEST_SOURCE_DISBURSEMENT) {
    const norm = normalizeName(name);
    if (!norm) return [];
    const store = this.getRequestStore(source);
    const history = [];
    for (const [rid, req] of Object.entries(store)) {
      if (normalizeName(req.name) !== norm) continue;
      const devices = req.devices_data?.length
        ? req.devices_data
        : (req.devices_serials || []).map((s) => ({ DecoderSerialNo: s }));
      history.push({
        request_id: rid,
        date: req.created_at || req.devices_confirmed_at || '',
        invoice_number:
          req.invoice_id || req.accountant_bill_number || req.invoice_number || '',
        shipment_id: req.shipment_id || '',
        devices_count: devices.length,
        devices,
        receiver: req.receiver || '',
        region: req.region || '',
        phone: req.phone || '',
        notes: req.notes || '',
        beneficiary_type: req.beneficiary_type || '',
        invoice_image: req.invoice_image || '',
        shipment_image: req.shipment_image || '',
        status: req.status || '',
      });
    }
    history.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return history;
  }

  // ============ users ============
  loadUsers() {
    const data = readJson(this.usersFile, null);
    if (data && typeof data === 'object' && Object.keys(data).length) {
      this.users = data;
    } else {
      this.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
      writeJson(this.usersFile, this.users);
    }
  }

  saveUsers() {
    writeJson(this.usersFile, this.users);
  }

  validateLogin(username, password) {
    const user = this.users[String(username || '').trim()];
    if (user && user.password === String(password || '').trim()) {
      return { username: String(username || '').trim(), ...user };
    }
    return null;
  }

  // ============ contacts ============
  loadContacts() {
    this.beneficiaries = readJson(this.beneficiariesFile, {});
    this.customers = readJson(this.customersFile, {});
    if (!this.beneficiaries || typeof this.beneficiaries !== 'object')
      this.beneficiaries = {};
    if (!this.customers || typeof this.customers !== 'object') this.customers = {};
  }

  saveBeneficiaries() {
    writeJson(this.beneficiariesFile, this.beneficiaries);
  }

  saveCustomers() {
    writeJson(this.customersFile, this.customers);
  }

  getContactsStore(source) {
    return source === REQUEST_SOURCE_CUSTOMER ? this.customers : this.beneficiaries;
  }

  findContact(name, source = REQUEST_SOURCE_DISBURSEMENT) {
    const norm = normalizeName(name);
    if (!norm) return null;
    const store = this.getContactsStore(source);
    for (const [key, entry] of Object.entries(store)) {
      if (normalizeName(entry.name) === norm) return [key, entry];
    }
    return null;
  }

  upsertContact({ name, phone = '', region = '', receiver = '', beneficiary_type = 'وكيل', source = REQUEST_SOURCE_DISBURSEMENT }) {
    name = String(name || '').trim();
    if (!name) return;
    if (source === REQUEST_SOURCE_CUSTOMER) beneficiary_type = 'عميل';
    else if (!beneficiary_type) beneficiary_type = 'وكيل';
    const store = this.getContactsStore(source);
    const key = storageKey(name);
    store[key] = {
      name,
      phone: phone || '',
      region: region || '',
      receiver: receiver || '',
      type: beneficiary_type,
    };
    if (source === REQUEST_SOURCE_CUSTOMER) this.saveCustomers();
    else this.saveBeneficiaries();
  }

  deleteContact(name, source = REQUEST_SOURCE_DISBURSEMENT) {
    const found = this.findContact(name, source);
    if (!found) return false;
    const store = this.getContactsStore(source);
    delete store[found[0]];
    if (source === REQUEST_SOURCE_CUSTOMER) this.saveCustomers();
    else this.saveBeneficiaries();
    return true;
  }

  // ============ inventory ============
  _normalizeStorageId(storageId) {
    const sid = storageId || DEFAULT_INVENTORY_STORAGE;
    return sid in this.inventoryStorages ? sid : DEFAULT_INVENTORY_STORAGE;
  }

  getStorageIds() {
    return [...INVENTORY_STORAGE_IDS];
  }

  getStorageLabel(storageId) {
    const sid = this._normalizeStorageId(storageId);
    return this.inventoryStorageLabels[sid] || sid;
  }

  loadInventory() {
    this.inventoryStorages = {};
    for (const sid of INVENTORY_STORAGE_IDS) this.inventoryStorages[sid] = [];
    this.inventoryStorageLabels = { ...INVENTORY_STORAGE_LABELS };
    const data = readJson(this.inventoryFile, {});
    if (data && typeof data === 'object' && data.storages) {
      for (const sid of INVENTORY_STORAGE_IDS) {
        const block = data.storages[sid] || {};
        this.inventoryStorages[sid] = Array.isArray(block.items) ? block.items : [];
        if (block.label) this.inventoryStorageLabels[sid] = block.label;
      }
    } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
      this.inventoryStorages[DEFAULT_INVENTORY_STORAGE] = data.items;
    }
  }

  saveInventory() {
    const storages = {};
    for (const sid of INVENTORY_STORAGE_IDS) {
      storages[sid] = {
        label: this.inventoryStorageLabels[sid] || sid,
        items: this.inventoryStorages[sid] || [],
      };
    }
    writeJson(this.inventoryFile, {
      storages,
      last_updated: new Date().toISOString(),
    });
  }

  getInventoryItems(storageId = null) {
    return [...this._storageItems(storageId)];
  }

  _storageItems(storageId) {
    return this.inventoryStorages[this._normalizeStorageId(storageId)];
  }

  addInventoryItems(items, storageId = null) {
    const sid = this._normalizeStorageId(storageId);
    const bucket = this.inventoryStorages[sid];
    const existingIds = new Set(bucket.map((i) => i.ID));
    let added = 0;
    for (const item of items) {
      if (item.ID && !existingIds.has(item.ID)) {
        bucket.push(item);
        existingIds.add(item.ID);
        added += 1;
      }
    }
    if (added) this.saveInventory();
    return added;
  }

  searchInventory(query, storageId = null) {
    const q = String(query || '').toLowerCase();
    return this._storageItems(storageId).filter((item) =>
      Object.values(item).some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }

  findInventoryByCarton(cartonNo, storageId = null) {
    const val = String(cartonNo || '').trim();
    if (!val) return [];
    return this._storageItems(storageId).filter(
      (item) => String(item.CartonSerialNo || '').trim() === val,
    );
  }

  findInventoryBySerial(serial, storageId = null) {
    const val = String(serial || '').trim();
    if (!val) return [];
    const fields = ['ChipSerialNo', 'DecoderSerialNo', 'CardSerialNo', 'ID'];
    return this._storageItems(storageId).filter((item) =>
      fields.some((f) => String(item[f] || '').trim() === val),
    );
  }

  removeInventoryItems(itemsToRemove, storageId = null) {
    const sid = this._normalizeStorageId(storageId);
    const bucket = this.inventoryStorages[sid];
    const idSet = new Set(itemsToRemove.map((i) => i.ID).filter(Boolean));
    const decSet = new Set(itemsToRemove.map((i) => i.DecoderSerialNo).filter(Boolean));
    const chipSet = new Set(itemsToRemove.map((i) => i.ChipSerialNo).filter(Boolean));
    const cardSet = new Set(itemsToRemove.map((i) => i.CardSerialNo).filter(Boolean));
    const cartonSet = new Set(itemsToRemove.map((i) => i.CartonSerialNo).filter(Boolean));

    let removed = 0;
    const newItems = [];
    for (const item of bucket) {
      const matches =
        (item.ID && idSet.has(item.ID)) ||
        (item.DecoderSerialNo && decSet.has(item.DecoderSerialNo)) ||
        (item.ChipSerialNo && chipSet.has(item.ChipSerialNo)) ||
        (item.CardSerialNo && cardSet.has(item.CardSerialNo)) ||
        (item.CartonSerialNo && cartonSet.has(item.CartonSerialNo));
      if (matches) removed += 1;
      else newItems.push(item);
    }
    if (removed) {
      this.inventoryStorages[sid] = newItems;
      this.saveInventory();
    }
    return removed;
  }

  moveCartonBetweenStorages(cartonNo, fromStorageId, toStorageId) {
    const val = String(cartonNo || '').trim();
    if (!val) return 0;
    const fromSid = this._normalizeStorageId(fromStorageId);
    const toSid = this._normalizeStorageId(toStorageId);
    if (fromSid === toSid) return 0;
    const items = this.findInventoryByCarton(val, fromSid);
    if (!items.length) return 0;
    this.removeInventoryItems(items, fromSid);
    return this.addInventoryItems(items, toSid);
  }

  // ============ customer devices (returns lookup) ============
  // Tracks, per beneficiary name, every device that has ever been
  // dispatched to them — used by the "المرتجع" (returns) flow to look a
  // carton up against what a specific person actually received.
  loadCustomerDevices() {
    const data = readJson(this.customerDevicesFile, {});
    this.customerDevices =
      data && typeof data === 'object' && data.customers ? data.customers : {};
  }

  saveCustomerDevices() {
    writeJson(this.customerDevicesFile, {
      customers: this.customerDevices,
      last_updated: new Date().toISOString(),
    });
  }

  recordCustomerDevices(name, devices, meta = {}) {
    const key = String(name || '').trim();
    if (!key || !devices || !devices.length) return;
    if (!this.customerDevices[key]) this.customerDevices[key] = [];
    const dispatchedAt = new Date().toISOString();
    for (const d of devices) {
      this.customerDevices[key].push({
        ...d,
        req_id: meta.req_id || '',
        dispatched_at: dispatchedAt,
        returned: false,
      });
    }
    this.saveCustomerDevices();
  }

  getCustomerDeviceNames() {
    return Object.keys(this.customerDevices)
      .filter((name) => (this.customerDevices[name] || []).length > 0)
      .sort((a, b) => a.localeCompare(b, 'ar'));
  }

  findCustomerDevicesByCarton(name, cartonNo) {
    const key = String(name || '').trim();
    const val = String(cartonNo || '').trim();
    if (!key || !val) return [];
    return (this.customerDevices[key] || []).filter(
      (d) => String(d.CartonSerialNo || '').trim() === val,
    );
  }

  findCustomerDeviceBySerial(name, serial) {
    const key = String(name || '').trim();
    const val = String(serial || '').trim();
    if (!key || !val) return null;
    const list = this.customerDevices[key] || [];
    return (
      list.find(
        (d) =>
          String(d.ID || '') === val ||
          String(d.DecoderSerialNo || '') === val ||
          String(d.ChipSerialNo || '') === val ||
          String(d.CardSerialNo || '') === val,
      ) || null
    );
  }

  // Returning a device removes it from the customer's active device list
  // entirely (rather than just flagging it), so مخزن العميل only ever shows
  // what they actually still have. The full return history isn't lost —
  // it's kept on the originating request's `returns` array (see
  // addReturnToRequest) and in مخزن المرتجع, which is what the returns
  // banner and reports read from.
  markCustomerDevicesReturned(name, deviceIds) {
    const key = String(name || '').trim();
    const idSet = new Set(deviceIds);
    const list = this.customerDevices[key] || [];
    const before = list.length;
    this.customerDevices[key] = list.filter((d) => !idSet.has(d.ID));
    const count = before - this.customerDevices[key].length;
    if (count) this.saveCustomerDevices();
    return count;
  }

  // Same mechanic as markCustomerDevicesReturned: a device pulled back for
  // being a منتج مصنعي معيب comes off the customer's active device list
  // entirely, since they no longer have it. History lives on the
  // originating request's `defects` array (see addDefectToRequest) and in
  // مخزن العيب المصنعي.
  markCustomerDevicesDefective(name, deviceIds) {
    const key = String(name || '').trim();
    const idSet = new Set(deviceIds);
    const list = this.customerDevices[key] || [];
    const before = list.length;
    this.customerDevices[key] = list.filter((d) => !idSet.has(d.ID));
    const count = before - this.customerDevices[key].length;
    if (count) this.saveCustomerDevices();
    return count;
  }

  // ============ images ============
  toImageUrl(p) {
    if (!p) return '';
    const s = String(p).replace(/\\/g, '/');
    if (s.startsWith('/uploads/') || /^https?:\/\//.test(s)) return s;
    const base = s.split('/').pop();
    if (base && fs.existsSync(path.join(UPLOADS_DIR, base))) return `/uploads/${base}`;
    return s;
  }

  normalizeImages(req) {
    const out = { ...req };
    const map = (v) => (v ? this.toImageUrl(v) : '');
    out.invoice_image = map(req.invoice_image);
    out.accountant_invoice_image = map(req.accountant_invoice_image);
    out.notes_image = map(req.notes_image);
    out.shipment_image = map(req.shipment_image);
    out.hand_delivery_image = map(req.hand_delivery_image);
    if (Array.isArray(req.invoice_images))
      out.invoice_images = req.invoice_images.map(map).filter(Boolean);
    if (Array.isArray(req.ship_images))
      out.ship_images = req.ship_images.map(map).filter(Boolean);
    return out;
  }
}
