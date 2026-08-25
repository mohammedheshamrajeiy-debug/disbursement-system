import { useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadUrl } from "../../api.js";
import ImagesModal, { ImageThumbs } from "./ImagesModal.jsx";
import { fmtTime, isImageUrl } from "../ui.jsx";

const SECTIONS = {
  header: "requestDetails.basicInfo",
  notes: "requestDetails.notes",
  invoice: "requestDetails.invoice",
  shipment: "requestDetails.shipment",
  hand: "requestDetails.hand",
  devices: "requestDetails.devices",
};

export default function RequestDetails({ request, sections, hideFinancial = false }) {
  const { t } = useTranslation();
  const [view, setView] = useState(null);
  const show = sections || Object.keys(SECTIONS);

  if (!request) {
    return <div className="empty-hint">{t("requestDetails.noRequestSelected")}</div>;
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
        {t("requestDetails.view", { count: u.length })} {label}
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
            {t("requestDetails.returnedBanner", { count: returnedCount })}
          </span>
          <ul>
            {returns.map((r, i) => (
              <li key={i}>
                {r.return_req_id ? <b>{r.return_req_id}</b> : null}
                {r.return_req_id ? " — " : ""}
                {t("requestDetails.returnDeviceCount", {
                  count: (r.device_ids || []).length,
                })}
                {r.carton_no
                  ? t("requestDetails.carton", { no: r.carton_no })
                  : ""}{" "}
                — {fmtTime(r.date)}
                {r.notes ? ` (${r.notes})` : ""}
                {(r.device_ids || []).length ? (
                  <div className="returns-device-ids">
                    IDs: {(r.device_ids || []).join("ØŒ ")}
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
            <b>{t("requestDetails.requestNumber")}:</b> {d.req_id}
          </div>
          <div className="kv">
            <b>{t("requestDetails.name")}:</b> {d.name}
          </div>
          <div className="kv">
            <b>{t("requestDetails.phone")}:</b> {d.phone || "—"}
          </div>
          <div className="kv">
            <b>{t("requestDetails.region")}:</b> {d.region || "—"}
          </div>
          <div className="kv">
            <b>{t("requestDetails.receiver")}:</b> {d.receiver || "—"}
          </div>
          <div className="kv">
            <b>{t("requestDetails.type")}:</b> {d.type || d.beneficiary_type || "—"}
          </div>
          <div className="kv">
            <b>{t("requestDetails.status")}:</b> <StatusText status={d.status} />
          </div>
          <div className="kv">
            <b>{t("requestDetails.itemsCount")}:</b> {d.items_count || "—"}
          </div>
          <div className="kv">
            <b>{t("requestDetails.totalQuantity")}:</b> {d.total_count || "—"}
          </div>
          <div className="kv">
            <b>{t("requestDetails.createdAt")}:</b> {fmtTime(d.created_at)}
          </div>
        </div>
      )}

      {show.includes("header") && (d.items || []).length > 0 && (
        <div className="details-section">
          <h4>{t("requestDetails.itemsHeader", { count: d.items.length })}</h4>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>{t("requestDetails.type")}</th>
                  <th>{t("requestDetails.quantity")}</th>
                  <th>{t("requestDetails.description")}</th>
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
          <h4>{t("requestDetails.notes")}</h4>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {d.notes || t("requestDetails.noNotes")}
          </div>
          <ImageThumbs
            urls={viewableUrls("notes_image")}
            onView={() =>
              setView({ urls: viewableUrls("notes_image"), label: t("requestDetails.notes") })
            }
          />
        </div>
      )}

      {show.includes("invoice") && (
        <div className="details-section">
          <h4>{t("requestDetails.invoice")}</h4>
          <div className="details-grid">
            <div className="kv">
              <b>{t("requestDetails.invoiceNumber")}:</b> {d.invoice_number || "—"}
            </div>
            <div className="kv">
              <b>{t("requestDetails.invoiceDate")}:</b> {d.invoice_date || "—"}
            </div>
            <div className="kv">
              <b>{t("requestDetails.saleOrder")}:</b> {d.sale_order || "—"}
            </div>
          </div>
          <div className="img-thumbs">
            {imageBtn(d.invoice_images || d.invoice_image, t("requestDetails.saleOrder"))}
            {imageBtn(d.accountant_invoice_image, t("requestDetails.accountingInvoice"))}
          </div>
        </div>
      )}

      {show.includes("shipment") && (
        <div className="details-section">
          <h4>{t("requestDetails.shipment")}</h4>
          <div className="details-grid">
            <div className="kv">
              <b>{t("requestDetails.waybillNumber")}:</b> {d.shipment_id || "—"}
            </div>
            <div className="kv">
              <b>{t("requestDetails.carrier")}:</b> {d.shipment_carrier || "—"}
            </div>
            <div className="kv">
              <b>{t("requestDetails.shipmentDate")}:</b> {d.shipment_date || "—"}
            </div>
          </div>
          <div className="img-thumbs">
            {imageBtn(d.shipment_images || d.shipment_image, t("requestDetails.shipmentImage"))}
          </div>
        </div>
      )}

      {show.includes("hand") && (
        <div className="details-section">
          <h4>{t("requestDetails.hand")}</h4>
          <div className="details-grid">
            <div className="kv">
              <b>{t("requestDetails.receiver")}:</b> {d.hand_delivery_receiver || d.hand_receiver || "—"}
            </div>
            <div className="kv">
              <b>{t("requestDetails.date")}:</b> {d.hand_delivery_date || d.hand_date || "—"}
            </div>
            <div className="kv">
              <b>{t("requestDetails.notes")}:</b> {d.hand_delivery_notes || d.hand_notes || "—"}
            </div>
          </div>
          <div className="img-thumbs">
            {imageBtn(d.hand_delivery_image || d.hand_image, t("requestDetails.handoverImage"))}
          </div>
        </div>
      )}

      {show.includes("devices") && (
        <div className="details-section">
          <h4>
            {t("requestDetails.devicesHeader", {
              count: remainingDevices.length,
            })}
            {returnedCount > 0
              ? t("requestDetails.ofTotal", { count: devices.length })
              : ""}
          </h4>
          {devices.length ? (
            <a
              className="btn"
              href={downloadUrl(`/requests/${encodeURIComponent(d.req_id)}/devices.xlsx`)}
            >
              {t("requestDetails.openDevicesSheet")}
            </a>
          ) : (
            <div className="empty-hint">{t("requestDetails.noDevices")}</div>
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
  const { t } = useTranslation();
  const map = {
    pending: ["status.pending", ""],
    invoice: ["status.invoice", "status-invoice"],
    devices: ["status.devices", "status-devices"],
    shipped: ["status.shipped", "status-shipped"],
    hand: ["status.hand", "status-hand"],
    activation: ["status.activation", "status-activation"],
    activated: ["status.activated", "status-activated"],
  };
  const [label, cls] = map[status] || [status || "—", ""];
  return <span className={`status-chip ${cls}`}>{map[status] ? t(label) : label}</span>;
}
