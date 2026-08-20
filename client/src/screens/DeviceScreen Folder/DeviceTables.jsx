import { useTranslation } from "react-i18next";

export const DEV_COLS = [
  { key: "customer_name", title: "deviceTables.customerName" },
  { key: "invoice_number", title: "deviceTables.invoiceNumber" },
  { key: "ID", title: "deviceTables.id" },
  { key: "CartonSerialNo", title: "deviceTables.carton" },
  { key: "DecoderSerialNo", title: "deviceTables.receiver" },
  { key: "ChipSerialNo", title: "deviceTables.chip" },
  { key: "CardSerialNo", title: "deviceTables.card" },
  { key: "Model_name", title: "deviceTables.model" },
];

export const CARTON_DEV_COLS = [
  ...DEV_COLS,
  { key: "sku", title: "deviceTables.sku" },
  { key: "duration", title: "deviceTables.duration" },
];

export function DeviceBrowseTable({ rows, sel, toggleSel, onExport, columns = DEV_COLS }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              {columns.map((c) => (
                <th key={c.key}>{t(c.title)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ID} className={sel.has(r.ID) ? "selected" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={sel.has(r.ID)}
                    onChange={() => toggleSel(r.ID)}
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.key}>{r[c.key] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <div className="empty-hint">{t("deviceTables.noResults")}</div> : null}
      {onExport ? (
        <button
          className="btn btn-sm"
          style={{ marginTop: 8 }}
          onClick={onExport}
        >
          {t("deviceTables.export")}
        </button>
      ) : null}
    </div>
  );
}

export function DeviceEditTable({
  rows,
  sel,
  toggleSel,
  onDelete,
  columns = DEV_COLS,
  onExport,
}) {
  const { t } = useTranslation();
  const allSelected = rows.length > 0 && rows.every((r) => sel.has(r.ID));
  function toggleAll() {
    if (allSelected) {
      rows.forEach((r) => {
        if (sel.has(r.ID)) toggleSel(r.ID);
      });
    } else {
      rows.forEach((r) => {
        if (!sel.has(r.ID)) toggleSel(r.ID);
      });
    }
  }
  return (
    <div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="grid">
          <thead>
            <tr>
              <th>
                {rows.length ? (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    title={t("deviceTables.selectAll")}
                  />
                ) : null}
              </th>
              {columns.map((c) => (
                <th key={c.key}>{t(c.title)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ID} className={sel.has(r.ID) ? "selected" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={sel.has(r.ID)}
                    onChange={() => toggleSel(r.ID)}
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.key}>{r[c.key] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <div className="empty-hint">{t("deviceTables.tableEmpty")}</div> : null}
      <div className="form-row" style={{ marginTop: 8 }}>
        {rows.length ? (
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            {t("deviceTables.deleteSelectedCount", { count: sel.size })}
          </button>
        ) : null}
        {onExport ? (
          <button className="btn btn-sm" onClick={onExport}>
            {t("deviceTables.export")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
