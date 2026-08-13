import {
  REQUEST_SOURCE_ALL,
  REQUEST_SOURCE_CUSTOMER,
  REQUEST_SOURCE_DISBURSEMENT,
  STATUS_INVOICED,
  STATUS_DISPATCHED,
  STATUS_SHIPPED,
  STATUS_ACTIVATING,
  STATUS_FULLY_ACTIVATED,
  STATUS_PENDING,
  DEVICE_TABLE_COLUMNS,
  DEVICE_TREE_FIELD_MAP,
} from '../config.js';
import { inferRequestSource } from '../dataManager.js';

export function parseReqId(raw) {
  if (!raw) return '';
  return raw.includes(' - ') ? raw.split(' - ')[0].trim() : String(raw).trim();
}

export function getInvoiceNumber(req) {
  return req.invoice_id || req.accountant_bill_number || req.invoice_number || '';
}

export function collectInvoiceImages(req) {
  const paths = [...(req.invoice_images || [])];
  if (req.invoice_image && !paths.includes(req.invoice_image)) paths.unshift(req.invoice_image);
  return paths.filter(Boolean);
}

export function collectShipmentImages(req) {
  const paths = [];
  if (req.shipment_image) paths.push(req.shipment_image);
  for (const p of req.ship_images || []) if (p && !paths.includes(p)) paths.push(p);
  return paths;
}

function field(device, ...keys) {
  for (const key of keys) {
    const val = device[key];
    if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
  }
  return '';
}

export function normalizeDeviceRow(device) {
  return {
    id: field(device, 'id', 'ID'),
    ID: field(device, 'ID', 'id'),
    CartonSerialNo: field(device, 'CartonSerialNo'),
    DecoderSerialNo: field(device, 'DecoderSerialNo'),
    ChipSerialNo: field(device, 'ChipSerialNo'),
    CardSerialNo: field(device, 'CardSerialNo'),
    sku: field(device, 'sku'),
    duration: field(device, 'duration'),
    import_source: field(device, 'import_source'),
    distributer_DATE: field(device, 'distributer_DATE'),
    DeltaBillNo: field(device, 'DeltaBillNo'),
    ItemAddOn: field(device, 'ItemAddOn'),
    ModelID: field(device, 'ModelID'),
    Model_name: field(device, 'Model_name'),
    returned: !!device.returned,
  };
}

export function collectDevicesData(req) {
  const devices = req.devices_data || [];
  if (devices.length) return devices.map(normalizeDeviceRow);
  const serials = (req.devices_serials || []).filter(Boolean);
  return serials.map((s) => normalizeDeviceRow({ DecoderSerialNo: String(s), id: String(s) }));
}

export function collectDeviceSerials(req) {
  const devices = collectDevicesData(req);
  if (devices.length) {
    return devices
      .map((d) => d.DecoderSerialNo || d.id || d.ID || '')
      .filter(Boolean)
      .map(String);
  }
  return (req.devices_serials || []).filter(Boolean).map(String);
}

export function deviceRowToTreeValues(device) {
  const row = normalizeDeviceRow(device);
  return [row.id, row.CartonSerialNo, row.DecoderSerialNo, row.ChipSerialNo, row.CardSerialNo, row.Model_name];
}

export function treeValuesToDevice(vals) {
  const device = {};
  DEVICE_TABLE_COLUMNS.forEach((spec, i) => {
    const colId = spec[0];
    device[DEVICE_TREE_FIELD_MAP[colId]] = vals[i] !== undefined ? vals[i] : '';
  });
  return device;
}

export function getRequestDisplayData(reqId, req) {
  const items = req.items || [];
  const total = items.reduce((s, it) => s + (it.count || 0), 0);
  const invoiceNumber = getInvoiceNumber(req);
  const shipmentId = req.shipment_id || '';
  return {
    req_id: reqId,
    name: req.name || '',
    beneficiary_type: req.beneficiary_type || '',
    phone: req.phone || '',
    region: req.region || '',
    receiver: req.receiver || '',
    status: req.status || '',
    items: items,
    notes: req.notes || '',
    notes_image: req.notes_image || '',
    invoice_number: invoiceNumber || 'غير مضافة بعد',
    invoice_date: req.invoice_date || '',
    invoice_amount: req.invoice_amount || '',
    sale_order: req.sale_order || '',
    invoice_images: collectInvoiceImages(req),
    accountant_invoice_image: req.accountant_invoice_image || '',
    shipment_id: shipmentId || 'غير مضافة بعد',
    shipment_carrier: req.shipment_carrier || '',
    shipment_date: req.shipment_date || '',
    shipment_images: collectShipmentImages(req),
    hand_delivery_receiver: req.hand_delivery_receiver || '',
    hand_delivery_date: req.hand_delivery_date || '',
    hand_delivery_notes: req.hand_delivery_notes || '',
    hand_delivery_image: req.hand_delivery_image || '',
    device_serials: collectDeviceSerials(req),
    devices_data: collectDevicesData(req),
    returns: req.returns || [],
    items_summary: `${total} جهاز`,
    items_count: items.length,
    total_count: total,
    financial_deducted: !!req.financial_deducted,
    created_at: String(req.created_at || '').slice(0, 19).replace('T', ' '),
  };
}

export function formatRequestLabel(reqId, req) {
  const items = req.items || [];
  const total = items.reduce((s, it) => s + (it.count || 0), 0);
  return `${reqId} - ${req.name || ''} (${total} جهاز)`;
}

export function isInvoiceComplete(req) {
  if (getInvoiceNumber(req)) return true;
  return [STATUS_INVOICED, STATUS_DISPATCHED, STATUS_SHIPPED, STATUS_ACTIVATING, STATUS_FULLY_ACTIVATED].includes(req.status);
}

export function isShipmentComplete(req) {
  if (req.delivery_method === 'hand' && (req.hand_delivery_date || '').trim()) return true;
  if ((req.shipment_id || '').trim()) return true;
  return [STATUS_SHIPPED, STATUS_ACTIVATING, STATUS_FULLY_ACTIVATED].includes(req.status);
}

export function isDevicesDispatchComplete(req) {
  return !!req.devices_confirmed;
}

export function isActivationComplete(req) {
  return req.status === STATUS_FULLY_ACTIVATED;
}

export const WORKFLOW_COMPLETE_CHECKS = {
  invoice: isInvoiceComplete,
  devices: isDevicesDispatchComplete,
  shipment: isShipmentComplete,
  activation: isActivationComplete,
};

export class RequestService {
  constructor(dm) {
    this.dm = dm;
  }

  _maxIdForPrefix(prefix, store) {
    let maxNum = 0;
    for (const rid of Object.keys(store)) {
      const rest = rid.slice(prefix.length);
      if (rid.startsWith(prefix) && /^\d+$/.test(rest)) {
        maxNum = Math.max(maxNum, parseInt(rest, 10));
      }
    }
    return maxNum;
  }

  generateDisbursementId() {
    const maxNum = this._maxIdForPrefix('D', this.dm.disbursementRequests);
    return `D${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateCustomerId() {
    const maxNum = this._maxIdForPrefix('C', this.dm.customerRequests);
    return `C${String(maxNum + 1).padStart(5, '0')}`;
  }

  listRequestLabels(source = REQUEST_SOURCE_ALL) {
    return this.dm.iterRequests(source).map(([rid, req]) => formatRequestLabel(rid, req));
  }

  listLabelsForWorkflow(stage = null, source = REQUEST_SOURCE_ALL) {
    if (!stage) return this.listRequestLabels(source);
    const completeFn = WORKFLOW_COMPLETE_CHECKS[stage];
    if (!completeFn) return this.listRequestLabels(source);
    return this.dm
      .iterRequests(source)
      .filter(([, req]) => !completeFn(req))
      .map(([rid, req]) => formatRequestLabel(rid, req));
  }

  // Inverse of listLabelsForWorkflow: requests that already finished a given
  // stage, so they can be pulled up again and edited/corrected.
  listLabelsForEditing(stage = null, source = REQUEST_SOURCE_ALL) {
    const completeFn = WORKFLOW_COMPLETE_CHECKS[stage];
    if (!completeFn) return [];
    return this.dm
      .iterRequests(source)
      .filter(([, req]) => completeFn(req))
      .map(([rid, req]) => formatRequestLabel(rid, req));
  }

  getRequest(rawId, source = REQUEST_SOURCE_ALL) {
    const reqId = parseReqId(rawId);
    if (!reqId) return null;
    if (source === REQUEST_SOURCE_DISBURSEMENT) {
      if (!(reqId in this.dm.disbursementRequests)) return null;
      return [reqId, this.dm.disbursementRequests[reqId]];
    }
    if (source === REQUEST_SOURCE_CUSTOMER) {
      if (!(reqId in this.dm.customerRequests)) return null;
      return [reqId, this.dm.customerRequests[reqId]];
    }
    const found = this.dm.findRequest(reqId);
    return found ? [reqId, found[1]] : null;
  }

  createRequest(data, source = REQUEST_SOURCE_DISBURSEMENT) {
    let reqId;
    let defaultType;
    if (source === REQUEST_SOURCE_CUSTOMER) {
      reqId = this.generateCustomerId();
      defaultType = 'عميل';
    } else {
      reqId = this.generateDisbursementId();
      defaultType = 'وكيل';
    }
    const record = {
      request_id: reqId,
      name: data.name || '',
      receiver: data.receiver || '',
      phone: data.phone || '',
      region: data.region || '',
      beneficiary_type: data.beneficiary_type || defaultType,
      items: data.items || [],
      notes: data.notes || '',
      notes_image: data.notes_image || '',
      status: STATUS_PENDING,
      created_at: new Date().toISOString(),
      date: data.date || new Date().toISOString().slice(0, 10),
    };
    this.dm.setRequest(reqId, record, source);
    this.dm.saveRequest(reqId);
    this.dm.log.logOperation(
      'create_request',
      `إنشاء طلب ${reqId} للمستفيد ${record.name}`,
    );
    return reqId;
  }

  updateRequestDevices(reqId, devicesData, devicesSerials) {
    const found = this.dm.findRequest(reqId);
    if (!found) throw new Error('طلب الصرف غير موجود');
    const req = found[1];
    req.devices_data = [...(req.devices_data || []), ...devicesData];
    req.devices_serials = devicesSerials;
    req.devices_confirmed = true;
    req.status = 'تم صرف الأجهزة';
    req.devices_confirmed_at = new Date().toISOString();
    this.dm.saveRequest(reqId);
    return req;
  }

  getBeneficiaryHistory(name, source = REQUEST_SOURCE_DISBURSEMENT) {
    return this.dm.getBeneficiaryHistory(name, source);
  }

  inferSource(reqId) {
    const found = this.dm.findRequest(reqId);
    return found ? found[0] : inferRequestSource(reqId);
  }
}
