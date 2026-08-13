import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Card, Table, fmtTime } from "./ui.jsx";
import { sortArabicFirst } from "../utils.js";
import ImagesModal from "./ImagesModal.jsx";

// Browse-only version of "العيب المصنعي": pick a name then a defect
// record, same two-step select pattern as الطلبات المحفوظة (RequestPanel),
// just backed by defect records instead of requests. No lookup/scan/submit
// here — actually processing a defect return still only happens from the
// الأجهزة tab.
export default function DefectsPanel({ title = "العيب المصنعي" }) {
  const [defects, setDefects] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/defects/requests");
      setDefects(d.requests || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const names = useMemo(() => {
    const set = new Set();
    for (const r of defects) if (r.name) set.add(r.name);
    return sortArabicFirst([...set]);
  }, [defects]);

  const filtered = useMemo(() => {
    if (!selectedName) return defects;
    return defects.filter((r) => r.name === selectedName);
  }, [defects, selectedName]);

  const selected = useMemo(
    () => filtered.find((r) => r.req_id === selectedId) || null,
    [filtered, selectedId],
  );

  const deviceCols = [
    { title: "ID", key: "ID" },
    { title: "الريسيفر", key: "DecoderSerialNo" },
    { title: "الشريحة", key: "ChipSerialNo" },
    { title: "البطاقة", key: "CardSerialNo" },
    { title: "الموديل", key: "Model_name" },
  ];

  return (
    <Card title={title}>
      <div className="form-row">
        <div className="field" style={{ flex: 1 }}>
          <label>اختر الاسم</label>
          <select
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setSelectedId("");
            }}
          >
            <option value="">كل الأسماء</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>اختر عيباً مصنعياً</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">— اختر —</option>
            {filtered.map((r) => (
              <option key={r.req_id} value={r.req_id}>
                {r.req_id} - {r.name} ({(r.device_ids || []).length} جهاز)
              </option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={() => load()}>
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="empty-hint">جاري التحميل...</div>
      ) : selected ? (
        <>
          <div
            className="details-grid"
            style={{ marginTop: 12, marginBottom: 12 }}
          >
            <div className="kv">
              <b>رقم العيب المصنعي:</b> {selected.req_id}
            </div>
            <div className="kv">
              <b>الاسم:</b> {selected.name}
            </div>
            <div className="kv">
              <b>التاريخ:</b> {fmtTime(selected.created_at)}
            </div>
            <div className="kv">
              <b>من الطلب:</b>{" "}
              {(selected.source_requests || []).join("، ") || "—"}
            </div>
            <div className="kv">
              <b>ملاحظات:</b> {selected.notes || "لا توجد ملاحظات"}
            </div>
          </div>
          {selected.notes_image ? (
            <div className="img-thumbs" style={{ marginBottom: 12 }}>
              <img
                className="img-thumb"
                src={selected.notes_image}
                onClick={() => setView([selected.notes_image])}
                alt=""
              />
            </div>
          ) : null}
          <Table
            columns={deviceCols}
            rows={selected.devices_data || []}
            rowKey={(r) => r.ID}
            emptyText="لا توجد أجهزة"
          />
        </>
      ) : (
        <div className="empty-hint" style={{ marginTop: 12 }}>
          اختر عيباً مصنعياً لعرض تفاصيله
        </div>
      )}

      {view ? (
        <ImagesModal
          title="صورة الملاحظات"
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </Card>
  );
}
