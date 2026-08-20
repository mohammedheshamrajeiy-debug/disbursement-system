# Graph Report - JS_version2.1  (2026-08-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 578 nodes · 1319 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d9325e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api
- config.js
- requestService.js
- notify
- App.jsx
- client/package.json
- DataManager
- excel.js
- DevicesSection .jsx
- InventoryScreen.jsx
- package.json
- t
- test_request_panel.js
- tmpebug_auth.js
- .deleteContact
- ._customerDevicesForSource
- debug_auth.js
- debug_labels.js
- cleanup-returned-customer-devices.js

## God Nodes (most connected - your core abstractions)
1. `DataManager` - 82 edges
2. `api()` - 69 edges
3. `notify()` - 35 edges
4. `requestRoutes()` - 22 edges
5. `useNotify()` - 21 edges
6. `RequestFormScreen()` - 21 edges
7. `Card()` - 20 edges
8. `t()` - 19 edges
9. `fmtTime()` - 17 edges
10. `DevicesScreen()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `downloadInventory()` --calls--> `downloadUrl()`  [EXTRACTED]
  client/src/screens/InventoryScreen.jsx → client/src/api.js
- `uploadNotesImage()` --calls--> `uploadImages()`  [EXTRACTED]
  client/src/screens/DeviceScreen Folder/DefectSection.jsx → client/src/api.js
- `uploadImage()` --calls--> `uploadImages()`  [EXTRACTED]
  client/src/screens/DeviceScreen Folder/DevicesScreen .jsx → client/src/api.js
- `uploadNotesImage()` --calls--> `uploadImages()`  [EXTRACTED]
  client/src/screens/DeviceScreen Folder/ReturnSection.jsx → client/src/api.js
- `exportDevices()` --calls--> `exportCsv()`  [EXTRACTED]
  client/src/screens/DeviceScreen Folder/DevicesScreen .jsx → client/src/utils.js

## Import Cycles
- None detected.

## Communities (23 total, 5 thin omitted)

### Community 0 - "api"
Cohesion: 0.06
Nodes (63): api(), downloadUrl(), getToken(), TOKEN_KEY, uploadImages(), USER_KEY, poll(), useNav() (+55 more)

### Community 1 - "config.js"
Cohesion: 0.06
Nodes (49): dm, dm, IMPORTANT: stop the running server before running this, and restart it, createSession(), deleteSession(), getSession(), sessions, ALL_TAB_KEYS (+41 more)

### Community 2 - "requestService.js"
Cohesion: 0.07
Nodes (30): DELIVERY_METHOD_HAND, DELIVERY_METHOD_SHIPMENT, DEVICE_TABLE_COLUMNS, DEVICE_TREE_FIELD_MAP, STATUS_ACTIVATING, STATUS_FULLY_ACTIVATED, STATUS_INVOICED, STATUS_PENDING (+22 more)

### Community 3 - "notify"
Cohesion: 0.06
Nodes (46): RequestFormScreen(), deleteContact(), fetchHistory(), fillFromContact(), handleNameChange(), loadContacts(), loadId(), loadNames() (+38 more)

### Community 4 - "App.jsx"
Cohesion: 0.07
Nodes (42): clearAuth(), getStoredUser(), setStoredUser(), setToken(), ActivationScreen, App(), CustomerScreen, DEFAULT_NAV (+34 more)

### Community 5 - "client/package.json"
Cohesion: 0.05
Nodes (41): dependencies, i18next, react, react-dom, react-i18next, devDependencies, vite, @vitejs/plugin-react (+33 more)

### Community 7 - "excel.js"
Cohesion: 0.17
Nodes (14): exportData(), extractAllNumbers(), extractAllRows(), getHeaderRow(), indexToColString(), parseNumber(), readSheet(), readWorkbook() (+6 more)

### Community 8 - "DevicesSection .jsx"
Cohesion: 0.16
Nodes (12): ActionsSection(), CartonImportSection(), CustomerImportSection(), DeliverySection(), DevicesSection(), CARTON_DEV_COLS, DEV_COLS, DeviceBrowseTable() (+4 more)

### Community 9 - "InventoryScreen.jsx"
Cohesion: 0.20
Nodes (13): InventoryScreen, money(), CUSTOMER_NAME_STORAGES, DEFECT_INV_COLS, INV_COLS, InventoryScreen(), downloadInventory(), importExcel() (+5 more)

### Community 10 - "package.json"
Cohesion: 0.14
Nodes (13): concurrently, description, devDependencies, concurrently, name, private, scripts, dev (+5 more)

### Community 12 - "test_request_panel.js"
Cohesion: 0.17
Nodes (9): apiLabels, fallbackId, fallbackName, fallbackNamesSet, fallbackWithSuffixes, fallbackWithSuffixesSet, labelToIdMap, multipleFallbackLabels (+1 more)

### Community 15 - "tmpebug_auth.js"
Cohesion: 0.28
Nodes (7): authMeResult, labelsResult, labelsResultNoToken, simulateApiCall(), simulateAuthLogin(), simulateGetToken(), simulateLogin()

### Community 19 - "debug_auth.js"
Cohesion: 0.47
Nodes (4): simulateApiCall(), simulateAuthLogin(), simulateGetToken(), simulateLogin()

### Community 20 - "debug_labels.js"
Cohesion: 0.33
Nodes (4): apiLabels, apiLabelsEn, names, namesEn

## Knowledge Gaps
- **90 isolated node(s):** `TOKEN_KEY`, `USER_KEY`, `SECTIONS`, `ToastContext`, `dm` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataManager` connect `DataManager` to `config.js`, `t`, `._writeRequestsFile`, `._normalizeStorageId`, `.constructor`, `.deleteContact`, `._customerDevicesForSource`, `cleanup-returned-customer-devices.js`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `api()` connect `api` to `InventoryScreen.jsx`, `notify`, `App.jsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `requestRoutes()` connect `requestService.js` to `config.js`, `excel.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `requestRoutes()` (e.g. with `.activateAll()` and `.activateDevice()`) actually correct?**
  _`requestRoutes()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TOKEN_KEY`, `USER_KEY`, `SECTIONS` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api` be split into smaller, more focused modules?**
  _Cohesion score 0.06311803071744161 - nodes in this community are weakly interconnected._
- **Should `config.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05627545353572751 - nodes in this community are weakly interconnected._