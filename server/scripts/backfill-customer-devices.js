// One-time backfill: populates customer_devices.json from requests that
// already had devices dispatched *before* the returns feature existed.
// Safe to re-run — it checks a flag saved on the request itself
// (customer_devices_recorded), NOT whether anything from that request is
// still present in customer_devices.json. That distinction matters: once a
// request's devices get returned, they're removed from customer_devices —
// checking presence there would make an already-backfilled (and since
// fully-returned) request look like it was never backfilled, and running
// this again would resurrect the returned devices. Checking a flag on the
// request avoids that regardless of how many of its devices have since
// been returned.
//
// Usage (from the server/ folder):
//   node scripts/backfill-customer-devices.js

import { DataManager } from '../src/dataManager.js';
import { REQUEST_SOURCE_DISBURSEMENT, REQUEST_SOURCE_CUSTOMER } from '../src/config.js';

const dm = new DataManager();

let scannedRequests = 0;
let backfilledRequests = 0;
let backfilledDevices = 0;
let skippedNoName = 0;
let skippedAlready = 0;

for (const source of [REQUEST_SOURCE_DISBURSEMENT, REQUEST_SOURCE_CUSTOMER]) {
  const store = dm.getRequestStore(source);
  for (const [reqId, req] of Object.entries(store)) {
    const devices = req.devices_data || [];
    if (!devices.length) continue;
    scannedRequests += 1;

    const name = String(req.name || '').trim();
    if (!name) {
      skippedNoName += 1;
      console.log(`[skip] ${reqId}: no beneficiary name on record`);
      continue;
    }

    if (req.customer_devices_recorded) {
      skippedAlready += 1;
      continue;
    }

    dm.recordCustomerDevices(name, devices, { req_id: reqId });
    req.customer_devices_recorded = true;
    backfilledRequests += 1;
    backfilledDevices += devices.length;
    console.log(`[ok] ${reqId} -> ${name}: ${devices.length} device(s)`);
  }
}

dm.saveDisbursementRequests();
dm.saveCustomerRequests();

console.log('---');
console.log(`Scanned requests with devices: ${scannedRequests}`);
console.log(`Backfilled requests:           ${backfilledRequests}`);
console.log(`Backfilled devices:            ${backfilledDevices}`);
console.log(`Skipped (already recorded):    ${skippedAlready}`);
console.log(`Skipped (no name on request):  ${skippedNoName}`);
