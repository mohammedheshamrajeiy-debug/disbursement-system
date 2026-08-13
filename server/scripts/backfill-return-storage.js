// One-time cleanup: re-applies every completed return request (from
// return_requests.json) onto (1) inventory storage_return and (2)
// customer_devices.json, for returns that got recorded before those two
// writes existed (or ran under an older build) and so never actually
// landed their devices in مخزن المرتجع / never got cleared off the
// customer's outstanding-devices list.
// Safe to re-run any time — addInventoryItems dedupes by ID, and
// markCustomerDevicesReturned is a no-op once a device is already gone.
//
// IMPORTANT: stop the running server before running this, and restart it
// afterward — the server only reads these JSON files at startup, and if
// it's left running it will overwrite this fix with its stale in-memory
// copy the next time it saves anything.
//
// Usage (from the server/ folder):
//   node scripts/backfill-return-storage.js

import { DataManager } from '../src/dataManager.js';
import { INVENTORY_STORAGE_RETURN } from '../src/config.js';

const dm = new DataManager();

let totalReturnRecords = 0;
let totalDevicesAdded = 0;
let totalCustomerDevicesRemoved = 0;

for (const record of dm.listReturnRequests()) {
  totalReturnRecords += 1;

  const items = record.devices_data || [];
  if (items.length) {
    const added = dm.addInventoryItems(items, INVENTORY_STORAGE_RETURN);
    if (added) {
      console.log(`[storage] ${record.req_id} -> ${added} device(s) into ${dm.getStorageLabel(INVENTORY_STORAGE_RETURN)}`);
      totalDevicesAdded += added;
    }
  }

  const ids = record.device_ids || [];
  if (ids.length) {
    const removed = dm.markCustomerDevicesReturned(record.name, ids);
    if (removed) {
      console.log(`[customer] ${record.req_id} -> removed ${removed} device(s) from ${record.name}'s outstanding list`);
      totalCustomerDevicesRemoved += removed;
    }
  }
}

console.log('---');
console.log(`Return records checked:        ${totalReturnRecords}`);
console.log(`Devices added to storage:      ${totalDevicesAdded}`);
console.log(`Customer devices removed:      ${totalCustomerDevicesRemoved}`);
