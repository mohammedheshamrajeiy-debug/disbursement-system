export const DEV_COLS = [
  { key: "customer_name", title: "اسم العميل" },
  { key: "invoice_number", title: "رقم الفاتورة" },
  { key: "ID", title: "ID" },
  { key: "CartonSerialNo", title: "الكرتونة" },
  { key: "DecoderSerialNo", title: "الريسيفر" },
  { key: "ChipSerialNo", title: "الشريحة" },
  { key: "CardSerialNo", title: "البطاقة" },
  { key: "Model_name", title: "الموديل" },
];

export const CARTON_DEV_COLS = [
  ...DEV_COLS,
  { key: "sku", title: "SKU" },
  { key: "duration", title: "المدة" },
];

export function DeviceBrowseTable({ rows, sel, toggleSel, onExport, columns = DEV_COLS }) {
  return (
    <div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              {columns.map((c) => (
                <th key={c.key}>{c.title}</th>
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
      {!rows.length ? <div className="empty-hint">لا توجد نتائج</div> : null}
      {onExport ? (
        <button
          className="btn btn-sm"
          style={{ marginTop: 8 }}
          onClick={onExport}
        >
          تصدير
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
                    title="تحديد الكل"
                  />
                ) : null}
              </th>
              {columns.map((c) => (
                <th key={c.key}>{c.title}</th>
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
      {!rows.length ? <div className="empty-hint">الجدول فارغ</div> : null}
      <div className="form-row" style={{ marginTop: 8 }}>
        {rows.length ? (
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            حذف المحدد ({sel.size})
          </button>
        ) : null}
        {onExport ? (
          <button className="btn btn-sm" onClick={onExport}>
            تصدير
          </button>
        ) : null}
      </div>
    </div>
  );
}
