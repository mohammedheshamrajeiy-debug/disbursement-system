import { INVENTORY_STORAGE_CUSTOMER, INVENTORY_STORAGE_RETURN, STATUS_DISPATCHED } from '../config.js';
import { parseReqId } from './requestService.js';

export class DeviceService {
  constructor(dm) {
    this.dm = dm;
  }

  saveDevicesAndInventory(reqId, devicesData, storageId = null) {
    reqId = parseReqId(reqId);
    if (!reqId || !this.dm.requestExists(reqId)) {
      throw new Error('طلب الصرف غير موجود');
    }
    if (!devicesData || !devicesData.length) {
      throw new Error('لا توجد أرقام أجهزة للحفظ');
    }

    // Defensive de-dup: collapse repeat IDs within the incoming payload
    // itself (e.g. a double-click or a stale-state re-add on the client
    // sending the same device more than once in one request), then drop
    // anything already saved on this request from an earlier call.
    const seenIncoming = new Set();
    devicesData = devicesData.filter((d) => {
      if (!d.ID || seenIncoming.has(d.ID)) return false;
      seenIncoming.add(d.ID);
      return true;
    });
    const alreadySaved = new Set(
      (this.dm.getRequest(reqId).devices_data || []).map((d) => d.ID),
    );
    devicesData = devicesData.filter((d) => !alreadySaved.has(d.ID));
    if (!devicesData.length) {
      throw new Error('هذه الأجهزة تم حفظها بالفعل لهذا الطلب');
    }

    const cartonSid = this.dm._normalizeStorageId(storageId);
    const customerSid = this.dm._normalizeStorageId(INVENTORY_STORAGE_CUSTOMER);

    const cartonDevices = devicesData.filter((d) => d.import_source === 'carton');
    const individualDevices = devicesData.filter((d) => d.import_source !== 'carton');

    const removedCarton = cartonDevices.length
      ? this.dm.removeInventoryItems(cartonDevices, cartonSid)
      : 0;
    const removedIndividual = individualDevices.length
      ? this.dm.removeInventoryItems(individualDevices, customerSid)
      : 0;
    const inventoryRemoved = removedCarton + removedIndividual;

    const req = this.dm.getRequest(reqId);
    req.devices_data = [...(req.devices_data || []), ...devicesData];
    req.devices_serials = req.devices_data.map(
      (d) => d.DecoderSerialNo || d.id || '',
    );
    req.devices_confirmed = true;
    req.status = STATUS_DISPATCHED;
    req.devices_confirmed_at = new Date().toISOString();
    req.inventory_storage = cartonSid;
    req.customer_inventory_storage = customerSid;
    this.dm.recordCustomerDevices(req.name, devicesData, { req_id: reqId });
    req.customer_devices_recorded = true;
    this.dm.saveRequest(reqId);

    const summaryParts = [`تم حفظ ${devicesData.length} جهاز`];
    if (removedCarton)
      summaryParts.push(`خصم من ${this.dm.getStorageLabel(cartonSid)}: ${removedCarton}`);
    if (removedIndividual)
      summaryParts.push(
        `خصم من ${this.dm.getStorageLabel(customerSid)}: ${removedIndividual}`,
      );
    const logDetail =
      summaryParts.length > 1 ? summaryParts.slice(1).join(' | ') : 'بدون خصم من المخزون';
    this.dm.log.logOperation(
      'save_devices',
      `حفظ ${devicesData.length} جهاز للطلب ${reqId} | ${logDetail}`,
    );
    this.dm.syncCustomerDevicesFile(req.name);

    return [req, summaryParts.join('\n')];
  }

  deductFinancialBalance(reqId, devicesData = null) {
    reqId = parseReqId(reqId);
    if (!reqId || !this.dm.requestExists(reqId)) {
      throw new Error('طلب الصرف غير موجود');
    }

    const req = this.dm.getRequest(reqId);
    if (req.financial_deducted) {
      throw new Error('تم خصم الرصيد المالي لهذا الطلب مسبقاً');
    }

    const items = devicesData && devicesData.length ? devicesData : req.devices_data || [];
    if (!items.length) {
      throw new Error('لا توجد أجهزة لخصم الرصيد — احفظ الأجهزة أولاً');
    }

    let financialDeducted = 0;
    let financialSkipped = 0;
    const financialErrors = [];

    for (const device of items) {
      const serials = [
        device.DecoderSerialNo,
        device.ChipSerialNo,
        device.CartonSerialNo,
        device.CardSerialNo,
        device.id,
      ];
      let deducted = false;
      for (const serial of serials) {
        if (!serial) continue;
        const record = this.dm.findRecordBySerial(String(serial));
        if (record) {
          const [success, message] = this.dm.deductFromRecord(record.record_id, 1.0);
          if (success) {
            financialDeducted += 1;
            deducted = true;
            break;
          }
          financialErrors.push(`${serial}: ${message}`);
          deducted = true;
          break;
        }
      }
      if (!deducted) financialSkipped += 1;
    }

    req.financial_deducted = true;
    req.financial_deducted_at = new Date().toISOString();
    this.dm.saveRequest(reqId);

    this.dm.log.logOperation(
      'deduct_financial',
      `خصم رصيد ${financialDeducted} جهاز للطلب ${reqId}`,
    );

    let summary = `خصم من الرصيد المالي: ${financialDeducted}\nبدون سجل مالي: ${financialSkipped}`;
    if (financialErrors.length)
      summary += '\nأخطاء الرصيد:\n' + financialErrors.slice(0, 5).join('\n');
    return [req, summary];
  }

  returnDevices(reqId, deviceIds, notes = '') {
    reqId = parseReqId(reqId);
    if (!reqId || !this.dm.requestExists(reqId)) {
      throw new Error('طلب الصرف غير موجود');
    }
    const ids = (deviceIds || []).filter(Boolean);
    if (!ids.length) {
      throw new Error('لم يتم تحديد أي أجهزة لإرجاعها');
    }

    const req = this.dm.getRequest(reqId);
    const currentDevices = req.devices_data || [];
    const idSet = new Set(ids.map(String));
    const returned = currentDevices.filter((d) => idSet.has(String(d.ID)));
    if (!returned.length) {
      throw new Error('الأجهزة المحددة غير موجودة ضمن أجهزة هذا الطلب');
    }
    const remaining = currentDevices.filter((d) => !idSet.has(String(d.ID)));

    const returnSid = this.dm._normalizeStorageId(INVENTORY_STORAGE_RETURN);
    const returnedAt = new Date().toISOString();
    const returnedRecords = returned.map((d) => ({
      ...d,
      returned_at: returnedAt,
      return_notes: notes || '',
    }));

    req.devices_data = remaining;
    req.devices_serials = remaining.map((d) => d.DecoderSerialNo || d.id || '');
    req.returned_devices = [...(req.returned_devices || []), ...returnedRecords];
    this.dm.saveRequest(reqId);

    this.dm.addInventoryItems(returned, returnSid);

    this.dm.log.logOperation(
      'return_devices',
      `إرجاع ${returned.length} جهاز من الطلب ${reqId} إلى ${this.dm.getStorageLabel(returnSid)}`,
    );
    this.dm.syncCustomerDevicesFile(req.name);

    const summary = `تم إرجاع ${returned.length} جهاز إلى ${this.dm.getStorageLabel(returnSid)}`;
    return [req, summary];
  }

  confirmDispatch(reqId, devicesData, storageId = null) {
    const [, summaryDevices] = this.saveDevicesAndInventory(reqId, devicesData, storageId);
    const [, summaryFinancial] = this.deductFinancialBalance(reqId, devicesData);
    return [`${summaryDevices}\n${summaryFinancial}`];
  }
}
