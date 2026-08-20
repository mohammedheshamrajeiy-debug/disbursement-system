import { STATUS_ACTIVATING, STATUS_FULLY_ACTIVATED } from '../config.js';
import { parseReqId } from './requestService.js';
import { t as defaultT } from '../i18n.js';

export class ActivationService {
  constructor(dm) {
    this.dm = dm;
  }

  allSerials(req) {
    const devices = req.devices_data || [];
    const serials = req.devices_serials || [];
    const fromDevices = devices.map((d) => d.DecoderSerialNo || d.id || '');
    return [...new Set([...fromDevices, ...serials].filter(Boolean))];
  }

  activateDevice(reqId, serial, date, notes, t = defaultT) {
    reqId = parseReqId(reqId);
    if (!reqId || !this.dm.requestExists(reqId)) {
      throw new Error(t('errors.requestNotFound'));
    }
    const req = this.dm.getRequest(reqId);
    const allSerials = this.allSerials(req);
    if (!allSerials.includes(serial)) {
      throw new Error(t('errors.serialNotInRequest', { serial }));
    }
    const activationData = req.activation_data || {};
    activationData[serial] = {
      date: date || new Date().toISOString().slice(0, 10),
      notes,
      activated_at: new Date().toISOString(),
    };
    req.activation_data = activationData;
    const allDone = allSerials.length && allSerials.every((s) => s in activationData);
    if (allDone) {
      req.status = STATUS_FULLY_ACTIVATED;
      if (!req.fully_activated_at) req.fully_activated_at = new Date().toISOString();
    } else {
      req.status = STATUS_ACTIVATING;
    }
    this.dm.saveRequest(reqId);
    this.dm.log.logOperation('activate_device', `تحميل جهاز ${serial} للطلب ${reqId}`);
    return req;
  }

  activateAll(reqId, date, notes, t = defaultT) {
    reqId = parseReqId(reqId);
    if (!reqId || !this.dm.requestExists(reqId)) {
      throw new Error(t('errors.requestNotFound'));
    }
    const req = this.dm.getRequest(reqId);
    const activationData = req.activation_data || {};
    const allSerials = this.allSerials(req);
    let count = 0;
    for (const serial of allSerials) {
      if (serial && !(serial in activationData)) {
        activationData[serial] = {
          date: date || new Date().toISOString().slice(0, 10),
          notes,
          activated_at: new Date().toISOString(),
        };
        count += 1;
      }
    }
    req.activation_data = activationData;
    if (allSerials.length && Object.keys(activationData).length >= allSerials.length) {
      req.status = STATUS_FULLY_ACTIVATED;
      if (!req.fully_activated_at) req.fully_activated_at = new Date().toISOString();
    } else {
      req.status = STATUS_ACTIVATING;
    }
    this.dm.saveRequest(reqId);
    this.dm.log.logOperation('activate_all', `تحميل ${count} جهاز للطلب ${reqId}`);
    return [count, req];
  }

  activationProgress(req) {
    const total = this.allSerials(req).length;
    const activated = Object.keys(req.activation_data || {}).length;
    return [activated, total];
  }
}
