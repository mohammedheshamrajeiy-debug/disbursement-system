// One-time cleanup: re-applies every return that's already been processed
// (from return_requests.json) onto customer_devices.json. Needed because
// the old backfill script could resurrect already-returned devices (see
// backfill-customer-devices.js for why) — this removes them again,
// regardless of how they got back in. Safe to re-run any time.
//
// Run this AFTER re-running backfill-customer-devices.js, so anything the
// backfill just resurrected gets cleaned up in the same pass.
//
// Usage (from the server/ folder):
//   node scripts/cleanup-returned-customer-devices.js

import { DataManager } from '../src/dataManager.js';

const dm = new DataManager();

let totalReturnRecords = 0;
let totalDevicesRemoved = 0;

for (const record of dm.listReturnRequests()) {
  totalReturnRecords += 1;
  const ids = record.device_ids || [];
  if (!ids.length) continue;
  const removed = dm.markCustomerDevicesReturned(record.name, ids);
  if (removed) {
    console.log(`[cleaned] ${record.req_id} -> ${record.name}: removed ${removed} device(s)`);
    totalDevicesRemoved += removed;
  }
}

console.log('---');
console.log(`Return records checked: ${totalReturnRecords}`);
console.log(`Devices removed:        ${totalDevicesRemoved}`);
