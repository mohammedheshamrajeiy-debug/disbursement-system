import { useState } from "react";
import { downloadUrl } from "../api.js";
import ImagesModal, { ImageThumbs } from "./ImagesModal.jsx";
import { fmtTime, isImageUrl } from "./ui.jsx";

const SECTIONS = {
  header: "بيانات أساسية",
  notes: "ملاحظات",
  invoice: "الفاتورة",
  shipment: "الشحن",
  hand: "استلام يدوي",
  devices: "الأجهزة",
};

export default function RequestDetails({ request, sections, hideFinancial = false }) {
  const [view, setView] = useState(null);
  const show = sections || Object.keys(SECTIONS);

  if (!request) {
    return <div className="empty-hint">لم يتم اختيار طلب</div>;
  }

  const d = request.display || request;
  const rawDevices = request.devices_data || d.devices_data || [];
  const allDevices = rawDevices.length
    ? rawDevices
    : request.devices_serials || d.devices_serials || [];
  // devices_data / returns can carry duplicate rows (e.g. from an older
  // save-retry bug) or repeated IDs across return batches, so de-dupe by ID
  // before counting anything — otherwise these numbers double/triple count.
  const devices = dedupeById(allDevices);
  const returns = request.returns || d.returns || [];
  const returnedIds = new Set();
  for (const r of returns) {
    for (const id of r.device_ids || []) returnedIds.add(id);
  }
  const returnedCount = returnedIds.size;
  const remainingDevices = devices.filter(
    (dv) => !dv.returned && !returnedIds.has(dv.ID),
  );

  function dedupeById(list) {
    const seen = new Set();
    const out = [];
    for (const item of list) {
      const id = item && item.ID;
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      out.push(item);
    }
    return out;
  }

  function urlList(v) {
    if (!v) return [];
    return Array.isArray(v) ? v : String(v).split(",").filter(Boolean);
  }

  function imageBtn(urls, label) {
    const u = urlList(urls);
    if (!u.length) return null;
    return (
      <span className="img-chip" onClick={() => setView({ urls: u, label })}>
        {u.length > 1 ? `عرض (${u.length})` : "عرض"} {label}
      </span>
    );
  }

  function viewableUrls(key) {
    const u = urlList(d[key]);
    const out = [];
    for (const x of u) {
      if (isImageUrl(x) || /\.pdf$/i.test(x)) out.push(x);
    }
    return out;
  }

  return (
    <div className="details-panel">
      {returnedCount > 0 && (
        <div className="returns-banner">
          <span>
            ⚠️ هذا العميل أرجع <b>{returnedCount}</b> جهاز من هذا الطلب
          </span>
          <ul>
            {returns.map((r, i) => (
              <li key={i}>
                {r.return_req_id ? <b>{r.return_req_id}</b> : null}
                {r.return_req_id ? " — " : ""}
                {(r.device_ids || []).length} جهاز
                {r.carton_no ? ` — كرتونة ${r.carton_no}` : ""} —{" "}
                {fmtTime(r.date)}
                {r.notes ? ` (${r.notes})` : ""}
                {(r.device_ids || []).length ? (
                  <div className="returns-device-ids">
                    IDs: {(r.device_ids || []).join("، ")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {show.includes("header") && (
        <div className="details-grid">
          <div className="kv">
            <b>رقم الطلب:</b> {d.req_id}
          </div>
          <div className="kv">
            <b>الاسم:</b> {d.name}
          </div>
          <div className="kv">
            <b>الهاتف:</b> {d.phone || "—"}
          </div>
          <div className="kv">
            <b>المنطقة:</b> {d.region || "—"}
          </div>
          <div className="kv">
            <b>المستلم:</b> {d.receiver || "—"}
          </div>
          <div className="kv">
            <b>النوع:</b> {d.type || d.beneficiary_type || "—"}
          </div>
          <div className="kv">
            <b>الحالة:</b> <StatusText status={d.status} />
          </div>
          <div className="kv">
            <b>عدد الأصناف:</b> {d.items_count || "—"}
          </div>
          <div className="kv">
            <b>إجمالي الكمية:</b> {d.total_count || "—"}
          </div>
          <div className="kv">
            <b>تاريخ الإنشاء:</b> {fmtTime(d.created_at)}
          </div>
        </div>
      )}

      {show.includes("header") && (d.items || []).length > 0 && (
        <div className="details-section">
          <h4>الأصناف ({d.items.length})</h4>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>النوع</th>
                  <th>الكمية</th>
                  <th>الوصف</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.device_type || "—"}</td>
                    <td>{it.count ?? "—"}</td>
                    <td>{it.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {show.includes("notes") && (
        <div className="details-section">
          <h4>ملاحظات</h4>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {d.notes || "لا توجد ملاحظات"}
          </div>
          <ImageThumbs
            urls={viewableUrls("notes_image")}
            onView={() =>
              setView({ urls: viewableUrls("notes_image"), label: "ملاحظات" })
            }
          />
        </div>
      )}

      {show.includes("invoice") && (
        <div className="details-section">
          <h4>الفاتورة</h4>
          <div className="details-grid">
            <div className="kv">
              <b>رقم الفاتورة:</b> {d.invoice_number || "—"}
            </div>
            <div className="kv">
              <b>تاريخ الفاتورة:</b> {d.invoice_date || "—"}
            </div>
            <div className="kv">
              <b>أمر البيع:</b> {d.sale_order || "—"}
            </div>
          </div>
          <div className="img-thumbs">
            {imageBtn(d.invoice_images || d.invoice_image, "أمر البيع")}
            {imageBtn(d.accountant_invoice_image, "الفاتورة المحاسبية")}
          </div>
        </div>
      )}

      {show.includes("shipment") && (
        <div className="details-section">
          <h4>الشحن</h4>
          <div className="details-grid">
            <div className="kv">
              <b>رقم البوليصة:</b> {d.shipment_id || "—"}
            </div>
            <div className="kv">
              <b>شركة النقل:</b> {d.shipment_carrier || "—"}
            </div>
            <div className="kv">
              <b>تاريخ الشحن:</b> {d.shipment_date || "—"}
            </div>
          </div>
          <div className="img-thumbs">
            {imageBtn(d.shipment_images || d.shipment_image, "الشحنة")}
          </div>
        </div>
      )}

      {show.includes("hand") && (
        <div className="details-section">
          <h4>استلام يدوي</h4>
          <div className="details-grid">
            <div className="kv">
              <b>المستلم:</b> {d.hand_delivery_receiver || d.hand_receiver || "—"}
            </div>
            <div className="kv">
              <b>التاريخ:</b> {d.hand_delivery_date || d.hand_date || "—"}
            </div>
            <div className="kv">
              <b>ملاحظات:</b> {d.hand_delivery_notes || d.hand_notes || "—"}
            </div>
          </div>
          <div className="img-thumbs">
            {imageBtn(d.hand_delivery_image || d.hand_image, "الاستلام")}
          </div>
        </div>
      )}

      {show.includes("devices") && (
        <div className="details-section">
          <h4>
            الأجهزة ({remainingDevices.length}
            {returnedCount > 0 ? ` من ${devices.length}` : ""})
          </h4>
          {devices.length ? (
            <a
              className="btn"
              href={downloadUrl(`/requests/${encodeURIComponent(d.req_id)}/devices.xlsx`)}
            >
              فتح شيت الأجهزة (Excel)
            </a>
          ) : (
            <div className="empty-hint">لا توجد أجهزة</div>
          )}
        </div>
      )}

      {view && (
        <ImagesModal
          title={`${view.label} - ${d.req_id}`}
          urls={view.urls}
          onClose={() => setView(null)}
        />
      )}
    </div>
  );
}

function StatusText({ status }) {
  const map = {
    pending: ["قيد الانتظار", ""],
    invoice: ["بانتظار الفاتورة", "status-invoice"],
    devices: ["بانتظار الأجهزة", "status-devices"],
    shipped: ["تم الشحن", "status-shipped"],
    hand: ["استلام يدوي", "status-hand"],
    activation: ["بانتظار التحميل", "status-activation"],
    activated: ["تم التحميل", "status-activated"],
  };
  const [label, cls] = map[status] || [status || "—", ""];
  return <span className={`status-chip ${cls}`}>{label}</span>;
}
