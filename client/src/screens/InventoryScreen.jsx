import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, downloadUrl } from "../api.js";
import { Card, Table, useNotify, money } from "../components/ui.jsx";

const STORAGES = [
  { id: "storage_1", label: "storage.storage_1" },
  { id: "storage_2", label: "storage.storage_2" },
  { id: "storage_customer", label: "storage.storage_customer" },
  { id: "storage_return", label: "storage.storage_return" },
  { id: "storage_defect", label: "storage.storage_defect" },
];

const INV_COLS = [
  { title: "ID", key: "ID" },
  { title: "inventoryScreen.carton", key: "CartonSerialNo" },
  { title: "inventoryScreen.receiver", key: "DecoderSerialNo" },
  { title: "inventoryScreen.chip", key: "ChipSerialNo" },
  { title: "inventoryScreen.card", key: "CardSerialNo" },
  { title: "inventoryScreen.model", key: "Model_name" },
];

// مخزن المرتجع ومخزن العيب المصنعي mix devices from every customer into
// one flat list, so those are the only storages where "whose device is
// this" matters — the other storages don't have a customer attached yet,
// so the column stays hidden there instead of showing an always-empty
// cell.
const CUSTOMER_NAME_STORAGES = ["storage_return", "storage_defect"];
const RETURN_INV_COLS = [
  ...INV_COLS,
  { title: "inventoryScreen.customerName", key: "CustomerName" },
];

// مخزن العيب المصنعي cares about what's wrong with the device, not its
// chip/card/model — and "ID" there is really just the scanned serial, not
// a meaningful sequence, so it's shown as a plain row number instead.
const DEFECT_INV_COLS = [
  { title: "ID", key: "ID", render: (r, i) => i + 1 },
  { title: "inventoryScreen.carton", key: "CartonSerialNo" },
  { title: "inventoryScreen.receiver", key: "DecoderSerialNo" },
  { title: "inventoryScreen.defectType", key: "DefectType" },
  { title: "inventoryScreen.customerName", key: "CustomerName" },
];

export default function InventoryScreen() {
  const notify = useNotify();
  const { t } = useTranslation();
  const [storageId, setStorageId] = useState("storage_1");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  const [moveCarton, setMoveCarton] = useState("");
  const [moveFrom, setMoveFrom] = useState("storage_1");
  const [moveTo, setMoveTo] = useState("storage_2");

  const loadReqId = useRef(0);

  async function loadInventory() {
    const reqId = ++loadReqId.current;
    const q = new URLSearchParams({ storage_id: storageId });
    if (query.trim()) q.set("query", query.trim());
    const d = await api(`/inventory?${q}`);
    if (reqId !== loadReqId.current) return; // a newer request already started, drop this stale response
    setItems(d.items || []);
    setCounts(d.counts || []);
  }

  async function loadSummary() {
    const d = await api("/inventory/summary");
    setSummary(d);
  }

  useEffect(() => {
    loadInventory().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageId]);

  useEffect(() => {
    loadSummary().catch(() => {});
  }, []);

  async function importExcel(file) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("storage_id", storageId);
      const d = await api("/inventory/import", {
        method: "POST",
        formData: fd,
      });
      notify(
        t("inventoryScreen.importedDevices", {
          added: d.added,
          total: d.total,
          label: t("storage." + storageId),
        }),
      );
      await loadInventory();
      await loadSummary();
    } finally {
      setBusy(false);
    }
  }

  async function moveCartonAction() {
    if (!moveCarton.trim()) return notify(t("inventoryScreen.enterCarton"), "error");
    const d = await api("/inventory/move-carton", {
      method: "POST",
      body: { carton: moveCarton.trim(), from: moveFrom, to: moveTo },
    });
    if (d.moved > 0) {
      notify(
        t("inventoryScreen.movedDevices", {
          count: d.moved,
          from: t("storage." + moveFrom),
          to: t("storage." + moveTo),
        }),
      );
      setMoveCarton("");
      await loadInventory();
      await loadSummary();
    } else {
      notify(t("inventoryScreen.cartonNotFound"), "error");
    }
  }

  const activeCols =
    storageId === "storage_defect"
      ? DEFECT_INV_COLS
      : CUSTOMER_NAME_STORAGES.includes(storageId)
        ? RETURN_INV_COLS
        : INV_COLS;

  function downloadInventory() {
    window.location.href = downloadUrl(
      `/inventory/export?storage_id=${storageId}`,
    );
  }

  return (
    <div>
      <Card title={t("inventoryScreen.inventorySummary")}>
        {summary ? (
          <div className="info-bar">
            {summary.storage_counts.map((s) => (
              <span key={s.id}>
                {t("storage." + s.id)}: <b>{s.count}</b>
              </span>
            ))}
            <span>
              {t("inventoryScreen.totalInventory")}{" "}
              <b>{summary.inventory_count}</b>
            </span>
            <span>
              {t("inventoryScreen.financialRecordsCount")}{" "}
              <b>{summary.record_count}</b>
            </span>
            <span>
              {t("inventoryScreen.currentBalance")}{" "}
              <b>{money(summary.total_balance)}</b>
            </span>
            <span>
              {t("inventoryScreen.deductions")}{" "}
              <b>{money(summary.total_deductions)}</b>
            </span>
          </div>
        ) : null}
      </Card>

      <Card title={t("inventoryScreen.moveCartonBetweenStorages")}>
            <div className="form-grid">
              <div className="field">
                <label>{t("inventoryScreen.cartonNumber")}</label>
                <input
                  value={moveCarton}
                  onChange={(e) => setMoveCarton(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t("inventoryScreen.from")}</label>
                <select
                  value={moveFrom}
                  onChange={(e) => setMoveFrom(e.target.value)}
                >
                  {STORAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(s.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t("inventoryScreen.to")}</label>
                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                >
                  {STORAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(s.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={moveCartonAction}>
                  {t("inventoryScreen.move")}
                </button>
              </div>
            </div>
          </Card>

          <Card title={t("inventoryScreen.inventory")}>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="radio-row">
                {STORAGES.map((s) => (
                  <label key={s.id}>
                    <input
                      type="radio"
                      name="inv"
                      checked={storageId === s.id}
                      onChange={() => setStorageId(s.id)}
                    />
                    {t(s.label)}
                    {counts.find((c) => c.id === s.id) ? (
                      <b> ({counts.find((c) => c.id === s.id).count})</b>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>{t("common.search")}</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadInventory()}
                />
              </div>
              <button className="btn" onClick={loadInventory}>
                {t("common.search")}
              </button>
              <label className="btn" style={{ cursor: "pointer" }}>
                {busy ? t("inventoryScreen.importing") : t("inventoryScreen.importExcel")}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={(e) => importExcel(e.target.files[0])}
                />
              </label>
              <button className="btn" onClick={downloadInventory}>
                {t("inventoryScreen.exportExcel")}
              </button>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="grid">
                <thead>
                  <tr>
                    {activeCols.map((c) => (
                      <th key={c.key}>{t(c.title)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={r.ID}>
                      {activeCols.map((c) => (
                        <td key={c.key}>
                          {c.render ? c.render(r, i) : r[c.key] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!items.length ? (
              <div className="empty-hint">
                {t("inventoryScreen.noDevicesInStorage")}
              </div>
            ) : null}
          </Card>
    </div>
  );
}
