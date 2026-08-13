import { useEffect, useRef, useState } from "react";
import { api, uploadImages } from "../../api.js";
import { Card, Modal, Table, useNotify, fmtTime } from "../../components/ui.jsx";
import ImagesModal from "../../components/ImagesModal.jsx";

export default function DefectSection() {
  const notify = useNotify();
  const [names, setNames] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [defectType, setDefectType] = useState("");
  const [replacementCode, setReplacementCode] = useState("");
  const [replacementMatches, setReplacementMatches] = useState([]);
  const [notes, setNotes] = useState("");
  const [notesImage, setNotesImage] = useState("");
  const [notesView, setNotesView] = useState(null);
  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showNamesList, setShowNamesList] = useState(false);
  const codeRef = useRef(null);
  // Every code already added in this session, so a repeat scan/entry warns
  // immediately instead of silently adding a duplicate.
  const [usedCodes, setUsedCodes] = useState(new Set());
  // Same idea, kept separate so a code used as a broken device can still
  // be scanned as a replacement (and vice versa) without tripping the
  // duplicate warning.
  const [usedReplacementCodes, setUsedReplacementCodes] = useState(new Set());
  const [showReplacementPicker, setShowReplacementPicker] = useState(false);

  // Every name that's ever appeared on a طلب صرف/عميل, plus anyone saved as
  // a contact — same list the name field on طلب الوكيل/طلب العميل uses, so
  // it's never empty just because no one has explicitly been "saved" as a
  // contact yet.
  useEffect(() => {
    api("/requests/names?source=all")
      .then((d) => setNames(d.names || []))
      .catch(() => {});
  }, []);

  function pickName(n) {
    setName(n);
    setShowNamesList(false);
    notify(`تم اختيار: ${n}`);
  }

  async function uploadNotesImage(files) {
    const data = await uploadImages(files);
    if (data.urls && data.urls.length) setNotesImage(data.urls[0]);
  }

  function addItems(items, value, matched) {
    const existingIds = new Set(matches.map((m) => m.ID));
    const newOnes = items.filter((m) => !existingIds.has(m.ID));
    setUsedCodes((prev) => new Set(prev).add(value));

    if (!newOnes.length) {
      notify("⚠️ هذا الجهاز مضاف بالفعل", "error");
      return;
    }

    setMatches((prev) => [...prev, ...newOnes]);
    notify(
      matched
        ? `تمت إضافة ${newOnes.length} جهاز (${value})`
        : `تمت إضافة الجهاز ${value}`,
    );
  }

  // رقم الجهاز (سكانر): adds one device at a time. Tries to match it
  // against what this person actually received first (so it comes in with
  // its full details and stays linked to the original request) — but
  // nothing has to exist beforehand: if nothing matches, the scanned/typed
  // code is simply added as-is.
  async function addCode(raw) {
    const value = raw.trim();
    if (!value) return;
    if (!name.trim()) {
      notify("اكتب اسم المستفيد أولاً", "error");
      return;
    }
    if (usedCodes.has(value)) {
      notify(`⚠️ تم إدخال "${value}" من قبل — لا يمكن تكراره`, "error");
      return;
    }

    let items = [];
    try {
      const q = new URLSearchParams({ name: name.trim(), carton: value });
      const d = await api(`/defects/lookup?${q}`);
      items = d.items || [];
    } catch {
      items = [];
    }
    const matched = items.length > 0;
    if (!matched) {
      // Nothing on record for this person under that code — just take it
      // as a brand-new device, identified only by the code itself.
      items = [{ ID: value }];
    }

    addItems(items, value, matched);
    setCode("");
  }

  function handleCodeKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addCode(code);
  }

  function removeMatch(id) {
    setMatches((prev) => prev.filter((m) => m.ID !== id));
    setUsedCodes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    notify(`تمت إزالة ${id}`);
  }

  // Shared by the scan input and the browse-picker modal: both end up with
  // a full device row from مخزن خدمة العملاء, they just get there
  // differently.
  function addReplacementItem(item, { silent } = {}) {
    const value = String(item.ID || "").trim();
    if (!value) return false;
    if (usedReplacementCodes.has(value)) {
      if (!silent) notify(`⚠️ تم إدخال "${value}" من قبل — لا يمكن تكراره`, "error");
      return false;
    }
    setUsedReplacementCodes((prev) => new Set(prev).add(value));
    setReplacementMatches((prev) => [...prev, item]);
    if (!silent) notify(`تمت إضافة الجهاز البديل ${value}`);
    return true;
  }

  async function addReplacement(raw) {
    const value = raw.trim();
    if (!value) return;
    if (!name.trim()) {
      notify("اكتب اسم المستفيد أولاً", "error");
      return;
    }
    if (usedReplacementCodes.has(value)) {
      notify(`⚠️ تم إدخال "${value}" من قبل — لا يمكن تكراره`, "error");
      return;
    }

    const q = new URLSearchParams({ code: value });
    let d;
    try {
      d = await api(`/defects/replacement-lookup?${q}`);
    } catch (e) {
      notify(e.message || "تعذر البحث عن الجهاز", "error");
      return;
    }
    if (!d.item) {
      notify("⚠️ لم يتم العثور على هذا الجهاز في مخزن خدمة العملاء", "error");
      return;
    }

    addReplacementItem(d.item);
    setReplacementCode("");
  }

  function handleReplacementKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addReplacement(replacementCode);
  }

  function removeReplacement(id) {
    setReplacementMatches((prev) => prev.filter((m) => m.ID !== id));
    setUsedReplacementCodes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    notify(`تمت إزالة ${id}`);
  }

  async function submitDefect() {
    if (!name.trim()) return notify("اكتب اسم المستفيد", "error");
    if (!matches.length) return notify("أضف جهازاً واحداً على الأقل", "error");
    setBusy(true);
    try {
      const d = await api("/defects", {
        method: "POST",
        body: {
          name: name.trim(),
          notes,
          notes_image: notesImage,
          defect_type: defectType.trim(),
          devices: matches,
          replacements: replacementMatches,
        },
      });

      notify(
        `تم إنشاء عيب مصنعي ${d.defect_req_id} — ${d.returned} جهاز إلى ${d.storage_label}` +
          (d.replaced
            ? ` — تم استبدال ${d.replaced} جهاز من مخزن خدمة العملاء`
            : "") +
          (d.affected_requests && d.affected_requests.length
            ? ` (من الطلب: ${d.affected_requests.join("، ")})`
            : ""),
      );
      setLastResult(d);
      setMatches([]);
      setUsedCodes(new Set());
      setCode("");
      setDefectType("");
      setReplacementMatches([]);
      setUsedReplacementCodes(new Set());
      setReplacementCode("");
      setNotes("");
      setNotesImage("");
    } catch (e) {
      notify(e.message || "تعذر إتمام تسجيل العيب المصنعي", "error");
    } finally {
      setBusy(false);
    }
  }

  const [showLog, setShowLog] = useState(false);
  const [viewDefect, setViewDefect] = useState(null);

  return (
    <Card title="العيب المصنعي">
      {lastResult ? (
        <div className="empty-hint" style={{ marginBottom: 8, fontWeight: 600 }}>
          آخر عيب مصنعي: <b>{lastResult.defect_req_id}</b> — {lastResult.returned}{" "}
          جهاز
          {lastResult.affected_requests && lastResult.affected_requests.length
            ? ` (من الطلب: ${lastResult.affected_requests.join("، ")})`
            : ""}
        </div>
      ) : null}

      <div className="form-grid">
        <div className="field">
          <label>1 — اسم المستفيد</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              list="defect-names-list"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب الاسم أو اختر من القائمة"
            />
            <datalist id="defect-names-list">
              {names.map((n, i) => (
                <option key={i} value={n} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowNamesList(true)}
            >
              القائمة
            </button>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>ملاحظات</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="field">
          <label>صورة الملاحظات</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => uploadNotesImage(e.target.files)}
          />
          {notesImage ? (
            <div className="img-thumbs">
              <img
                className="img-thumb"
                src={notesImage}
                onClick={() => setNotesView([notesImage])}
                alt=""
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>2 — امسح أو اكتب رقم الجهاز</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              ref={codeRef}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              placeholder="امسح بالسكانر ثم Enter، أو اكتب الرقم واضغط إضافة"
            />
            <button type="button" className="btn" onClick={() => addCode(code)}>
              إضافة
            </button>
          </div>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>نوع العطل</label>
          <input
            type="text"
            value={defectType}
            onChange={(e) => setDefectType(e.target.value)}
            placeholder="اكتب نوع العطل"
          />
        </div>
        <div className="field">
          <label>3 — امسح الجهاز البديل (من مخزن خدمة العملاء)</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              value={replacementCode}
              onChange={(e) => setReplacementCode(e.target.value)}
              onKeyDown={handleReplacementKeyDown}
              placeholder="امسح بالسكانر ثم Enter، أو اكتب الرقم واضغط إضافة"
            />
            <button
              type="button"
              className="btn"
              onClick={() => addReplacement(replacementCode)}
            >
              إضافة
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowReplacementPicker(true)}
            >
              اختيار من المخزن
            </button>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <button className="btn btn-sm" onClick={() => setShowLog(true)}>
          سجل طلبات العيب المصنعي
        </button>
        {matches.length ? (
          <button
            className="btn"
            onClick={() => {
              setMatches([]);
              setUsedCodes(new Set());
            }}
          >
            مسح القائمة
          </button>
        ) : null}
      </div>

      {matches.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>الأجهزة المضافة ({matches.length})</h4>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>رقم الطلب</th>
                  <th>الريسيفر</th>
                  <th>الشريحة</th>
                  <th>البطاقة</th>
                  <th>الموديل</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.ID}>
                    <td>{m.ID}</td>
                    <td>{m.req_id || "—"}</td>
                    <td>{m.DecoderSerialNo || "—"}</td>
                    <td>{m.ChipSerialNo || "—"}</td>
                    <td>{m.CardSerialNo || "—"}</td>
                    <td>{m.Model_name || "—"}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeMatch(m.ID)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-hint" style={{ marginTop: 12 }}>
          اكتب اسم المستفيد ثم امسح أو اكتب رقم الجهاز لإضافته
        </div>
      )}

      {replacementMatches.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>
            الأجهزة البديلة ({replacementMatches.length})
          </h4>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>الريسيفر</th>
                  <th>الشريحة</th>
                  <th>البطاقة</th>
                  <th>الموديل</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {replacementMatches.map((m) => (
                  <tr key={m.ID}>
                    <td>{m.ID}</td>
                    <td>{m.DecoderSerialNo || "—"}</td>
                    <td>{m.ChipSerialNo || "—"}</td>
                    <td>{m.CardSerialNo || "—"}</td>
                    <td>{m.Model_name || "—"}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeReplacement(m.ID)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {matches.length ? (
        <div className="form-row" style={{ marginTop: 10 }}>
          <button className="btn btn-primary" disabled={busy} onClick={submitDefect}>
            {busy ? "جاري التسجيل..." : "تسجيل العيب المصنعي إلى مخزن العيب المصنعي"}
          </button>
        </div>
      ) : null}

      {showLog ? (
        <DefectRequestsLogModal
          onClose={() => setShowLog(false)}
          onOpen={(r) => {
            setShowLog(false);
            setViewDefect(r);
          }}
        />
      ) : null}

      {viewDefect ? (
        <DefectRequestDetailModal
          record={viewDefect}
          onClose={() => setViewDefect(null)}
        />
      ) : null}

      {notesView ? (
        <ImagesModal
          title="صورة الملاحظات"
          urls={notesView}
          onClose={() => setNotesView(null)}
        />
      ) : null}

      {showReplacementPicker ? (
        <ReplacementPickerModal
          onClose={() => setShowReplacementPicker(false)}
          usedCodes={usedReplacementCodes}
          onPick={(item) => addReplacementItem(item)}
        />
      ) : null}

      {showNamesList ? (
        <Modal
          title="قائمة المستفيدين"
          onClose={() => setShowNamesList(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowNamesList(false)}>
              إغلاق
            </button>
          }
        >
          <Table
            columns={[
              { title: "الاسم", render: (n) => n },
              {
                title: "",
                render: (n) => (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => pickName(n)}
                  >
                    اختيار
                  </button>
                ),
              },
            ]}
            rows={names}
            rowKey={(n) => n}
            emptyText="لا توجد بيانات"
          />
        </Modal>
      ) : null}
    </Card>
  );
}

function DefectRequestsLogModal({ onClose, onOpen }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/defects/requests")
      .then((d) => setRows(d.requests || []))
      .catch(() => {});
  }, []);

  const cols = [
    { title: "الرقم", key: "req_id" },
    { title: "الاسم", key: "name" },
    { title: "التاريخ", render: (r) => fmtTime(r.created_at) },
    { title: "عدد الأجهزة", render: (r) => (r.device_ids || []).length },
    {
      title: "من الطلب",
      render: (r) => (r.source_requests || []).join("، ") || "—",
    },
    { title: "ملاحظات", render: (r) => r.notes || "—" },
    {
      title: "",
      render: (r) => (
        <button className="btn btn-sm btn-primary" onClick={() => onOpen(r)}>
          عرض
        </button>
      ),
    },
  ];

  return (
    <Modal
      title="سجل طلبات العيب المصنعي"
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <Table columns={cols} rows={rows} emptyText="لا توجد طلبات عيب مصنعي" />
    </Modal>
  );
}

function ReplacementPickerModal({ onClose, usedCodes, onPick }) {
  const notify = useNotify();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api("/inventory/customer-items")
      .then((d) => setItems(d.items || []))
      .catch((e) => notify(e.message || "تعذر تحميل مخزن خدمة العملاء", "error"))
      .finally(() => setLoading(false));
  }, []);

  const query = q.trim().toLowerCase();
  const filtered = query
    ? items.filter((it) =>
        Object.values(it).some((v) => String(v || "").toLowerCase().includes(query)),
      )
    : items;

  const cols = [
    { title: "ID", key: "ID" },
    { title: "الريسيفر", key: "DecoderSerialNo" },
    { title: "الشريحة", key: "ChipSerialNo" },
    { title: "البطاقة", key: "CardSerialNo" },
    { title: "الموديل", key: "Model_name" },
    {
      title: "",
      render: (it) => {
        const already = usedCodes.has(String(it.ID || "").trim());
        return (
          <button
            className="btn btn-sm btn-primary"
            disabled={already}
            onClick={() => onPick(it)}
          >
            {already ? "مُضاف" : "اختيار"}
          </button>
        );
      },
    },
  ];

  return (
    <Modal
      title={`اختيار جهاز بديل من مخزن خدمة العملاء (${items.length})`}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <div className="field" style={{ marginBottom: 10 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالرقم أو الريسيفر أو الشريحة أو البطاقة أو الموديل"
        />
      </div>
      {loading ? (
        <div className="empty-hint">جاري التحميل...</div>
      ) : (
        <Table
          columns={cols}
          rows={filtered}
          rowKey={(r) => r.ID}
          emptyText="لا توجد أجهزة في مخزن خدمة العملاء"
        />
      )}
    </Modal>
  );
}
function DefectRequestDetailModal({ record, onClose }) {
  const [view, setView] = useState(null);
  const cols = [
    { title: "ID", key: "ID" },
    { title: "الريسيفر", key: "DecoderSerialNo" },
    { title: "الشريحة", key: "ChipSerialNo" },
    { title: "البطاقة", key: "CardSerialNo" },
    { title: "الموديل", key: "Model_name" },
  ];
  return (
    <Modal
      title={`عيب مصنعي ${record.req_id}`}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <div className="details-grid" style={{ marginBottom: 12 }}>
        <div className="kv">
          <b>رقم العيب المصنعي:</b> {record.req_id}
        </div>
        <div className="kv">
          <b>الاسم:</b> {record.name}
        </div>
        <div className="kv">
          <b>التاريخ:</b> {fmtTime(record.created_at)}
        </div>
        <div className="kv">
          <b>من الطلب:</b> {(record.source_requests || []).join("، ") || "—"}
        </div>
        <div className="kv">
          <b>ملاحظات:</b> {record.notes || "لا توجد ملاحظات"}
        </div>
      </div>
      {record.notes_image ? (
        <div className="img-thumbs" style={{ marginBottom: 12 }}>
          <img
            className="img-thumb"
            src={record.notes_image}
            onClick={() => setView([record.notes_image])}
            alt=""
          />
        </div>
      ) : null}
      <Table
        columns={cols}
        rows={record.devices_data || []}
        rowKey={(r) => r.ID}
        emptyText="لا توجد أجهزة"
      />
      {record.replacements_data && record.replacements_data.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>
            الأجهزة البديلة ({record.replacements_data.length})
          </h4>
          <Table
            columns={cols}
            rows={record.replacements_data}
            rowKey={(r) => r.ID}
            emptyText="لا توجد أجهزة بديلة"
          />
        </>
      ) : null}
      {view ? (
        <ImagesModal
          title="صورة الملاحظات"
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </Modal>
  );
}
