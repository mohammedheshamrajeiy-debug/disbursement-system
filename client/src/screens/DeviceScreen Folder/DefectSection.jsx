import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, uploadImages } from "../../api.js";
import { Card, Modal, Table, useNotify, fmtTime } from "../../components/ui.jsx";
import ImagesModal from "../../components/ImagesModal.jsx";

export default function DefectSection() {
  const { t } = useTranslation();
  const notify = useNotify();
  const [names, setNames] = useState([]);
  const [name, setName] = useState("");
  // وكيل → طلب الصرف, عميل → طلب العميل. Everything below (names list,
  // device lookups, replacement lookups) is scoped to whichever one is
  // picked, so a وكيل defect can't accidentally pull in — or get confused
  // with — a same-named عميل, and vice versa.
  const [beneficiaryType, setBeneficiaryType] = useState("disbursement");
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
  // contact yet. Re-fetched whenever the وكيل/عميل toggle changes.
  useEffect(() => {
    api(`/requests/names?source=${beneficiaryType}`)
      .then((d) => setNames(d.names || []))
      .catch(() => {});
  }, [beneficiaryType]);

  function switchBeneficiaryType(t) {
    if (t === beneficiaryType) return;
    setBeneficiaryType(t);
    // Switching context — a name/device list scanned under وكيل means
    // nothing once you're looking at عميل, so start clean rather than
    // risk mixing the two in one submission.
    setName("");
    setMatches([]);
    setUsedCodes(new Set());
    setReplacementMatches([]);
    setUsedReplacementCodes(new Set());
  }

  function pickName(n) {
    setName(n);
    setShowNamesList(false);
    notify(t("defectSection.nameSelected", { name: n }));
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
      notify(t("defectSection.deviceAlreadyAdded"), "error");
      return;
    }

    setMatches((prev) => [...prev, ...newOnes]);
    notify(
      matched
        ? t("defectSection.addedDevices", { count: newOnes.length, value })
        : t("defectSection.addedDevice", { value }),
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
      notify(t("defectSection.typeBeneficiaryNameFirst"), "error");
      return;
    }
    if (usedCodes.has(value)) {
      notify(t("defectSection.codeAlreadyEntered", { value }), "error");
      return;
    }

    let items = [];
    try {
      const q = new URLSearchParams({
        name: name.trim(),
        carton: value,
        source: beneficiaryType,
      });
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
    notify(t("defectSection.deviceRemoved", { id }));
  }

  // Shared by the scan input and the browse-picker modal: both end up with
  // a full device row from مخزن خدمة العملاء, they just get there
  // differently.
  function addReplacementItem(item, { silent } = {}) {
    const value = String(item.ID || "").trim();
    if (!value) return false;
    if (usedReplacementCodes.has(value)) {
      if (!silent) notify(t("defectSection.codeAlreadyEntered", { value }), "error");
      return false;
    }
    setUsedReplacementCodes((prev) => new Set(prev).add(value));
    setReplacementMatches((prev) => [...prev, item]);
    if (!silent) notify(t("defectSection.replacementAdded", { value }));
    return true;
  }

  async function addReplacement(raw) {
    const value = raw.trim();
    if (!value) return;
    if (!name.trim()) {
      notify(t("defectSection.typeBeneficiaryNameFirst"), "error");
      return;
    }
    if (usedReplacementCodes.has(value)) {
      notify(t("defectSection.codeAlreadyEntered", { value }), "error");
      return;
    }

    const q = new URLSearchParams({ code: value });
    let d;
    try {
      d = await api(`/defects/replacement-lookup?${q}`);
    } catch (e) {
      notify(e.message || t("defectSection.lookupFailed"), "error");
      return;
    }
    if (!d.item) {
      notify(t("defectSection.deviceNotFoundCustomerStore"), "error");
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
    notify(t("defectSection.deviceRemoved", { id }));
  }

  async function submitDefect() {
    if (!name.trim()) return notify(t("defectSection.typeBeneficiaryName"), "error");
    if (!matches.length) return notify(t("defectSection.addAtLeastOneDevice"), "error");
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
          source: beneficiaryType,
        },
      });

      notify(
        t("defectSection.created", {
          count: d.returned,
          reqId: d.defect_req_id,
          storage: t("storage.storage_defect"),
        }) +
          (d.replaced
            ? t("defectSection.replaced", { count: d.replaced })
            : "") +
          (d.affected_requests && d.affected_requests.length
            ? t("defectSection.createdFromRequests", {
                requests: d.affected_requests.join("، "),
              })
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
      notify(e.message || t("defectSection.failedToComplete"), "error");
    } finally {
      setBusy(false);
    }
  }

  const [showLog, setShowLog] = useState(false);
  const [viewDefect, setViewDefect] = useState(null);

  return (
    <Card title={t("defectSection.title")}>
      {lastResult ? (
        <div className="empty-hint" style={{ marginBottom: 8, fontWeight: 600 }}>
          {t("defectSection.lastDefect", {
            count: lastResult.returned,
            reqId: lastResult.defect_req_id,
          })}
          {lastResult.affected_requests && lastResult.affected_requests.length
            ? t("defectSection.createdFromRequests", {
                requests: lastResult.affected_requests.join("، "),
              })
            : ""}
        </div>
      ) : null}

      <div className="form-grid">
        <div className="field">
          <label>{t("defectSection.beneficiaryType")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <button
              type="button"
              className={`btn btn-sm ${beneficiaryType === "disbursement" ? "btn-primary" : ""}`}
              onClick={() => switchBeneficiaryType("disbursement")}
            >
              {t("defectSection.agent")}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${beneficiaryType === "customer" ? "btn-primary" : ""}`}
              onClick={() => switchBeneficiaryType("customer")}
            >
              {t("defectSection.customer")}
            </button>
          </div>
        </div>
        <div className="field">
          <label>{t("defectSection.beneficiaryName")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              list="defect-names-list"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("defectSection.namePlaceholder")}
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
              {t("defectSection.list")}
            </button>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>{t("defectSection.notes")}</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("defectSection.notesImage")}</label>
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
          <label>{t("defectSection.scanDeviceLabel")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              ref={codeRef}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              placeholder={t("defectSection.scanPlaceholder")}
            />
            <button type="button" className="btn" onClick={() => addCode(code)}>
              {t("common.add")}
            </button>
          </div>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>{t("defectSection.defectType")}</label>
          <input
            type="text"
            value={defectType}
            onChange={(e) => setDefectType(e.target.value)}
            placeholder={t("defectSection.defectTypePlaceholder")}
          />
        </div>
        <div className="field">
          <label>{t("defectSection.replacementLabel")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              value={replacementCode}
              onChange={(e) => setReplacementCode(e.target.value)}
              onKeyDown={handleReplacementKeyDown}
              placeholder={t("defectSection.scanPlaceholder")}
            />
            <button
              type="button"
              className="btn"
              onClick={() => addReplacement(replacementCode)}
            >
              {t("common.add")}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowReplacementPicker(true)}
            >
              {t("defectSection.chooseFromStorage")}
            </button>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <button className="btn btn-sm" onClick={() => setShowLog(true)}>
          {t("defectSection.defectRequestsLog")}
        </button>
        {matches.length ? (
          <button
            className="btn"
            onClick={() => {
              setMatches([]);
              setUsedCodes(new Set());
            }}
          >
            {t("defectSection.clearList")}
          </button>
        ) : null}
      </div>

      {matches.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>
            {t("defectSection.addedDevicesCount", { count: matches.length })}
          </h4>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t("defectSection.requestNo")}</th>
                  <th>{t("defectSection.receiver")}</th>
                  <th>{t("defectSection.chip")}</th>
                  <th>{t("defectSection.card")}</th>
                  <th>{t("defectSection.model")}</th>
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
                        {t("common.delete")}
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
          {t("defectSection.emptyHint")}
        </div>
      )}

      {replacementMatches.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>
            {t("defectSection.replacementDevicesCount", {
              count: replacementMatches.length,
            })}
          </h4>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t("defectSection.receiver")}</th>
                  <th>{t("defectSection.chip")}</th>
                  <th>{t("defectSection.card")}</th>
                  <th>{t("defectSection.model")}</th>
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
                        {t("common.delete")}
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
            {busy ? t("defectSection.registering") : t("defectSection.registerDefect")}
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
          title={t("defectSection.notesImage")}
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
          title={t("defectSection.beneficiariesList")}
          onClose={() => setShowNamesList(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowNamesList(false)}>
              {t("common.close")}
            </button>
          }
        >
          <Table
            columns={[
              { title: t("defectSection.name"), render: (n) => n },
              {
                title: "",
                render: (n) => (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => pickName(n)}
                  >
                    {t("defectSection.choose")}
                  </button>
                ),
              },
            ]}
            rows={names}
            rowKey={(n) => n}
            emptyText={t("common.noData")}
          />
        </Modal>
      ) : null}
    </Card>
  );
}

function DefectRequestsLogModal({ onClose, onOpen }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/defects/requests")
      .then((d) => setRows(d.requests || []))
      .catch(() => {});
  }, []);

  const cols = [
    { title: t("defectSection.no"), key: "req_id" },
    { title: t("defectSection.name"), key: "name" },
    { title: t("defectSection.date"), render: (r) => fmtTime(r.created_at) },
    {
      title: t("defectSection.deviceCount"),
      render: (r) => (r.device_ids || []).length,
    },
    {
      title: t("defectSection.fromRequests"),
      render: (r) => (r.source_requests || []).join("، ") || "—",
    },
    { title: t("defectSection.notes"), render: (r) => r.notes || "—" },
    {
      title: "",
      render: (r) => (
        <button className="btn btn-sm btn-primary" onClick={() => onOpen(r)}>
          {t("common.show")}
        </button>
      ),
    },
  ];

  return (
    <Modal
      title={t("defectSection.defectRequestsLog")}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <Table columns={cols} rows={rows} emptyText={t("defectSection.noDefectRequests")} />
    </Modal>
  );
}

function ReplacementPickerModal({ onClose, usedCodes, onPick }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api("/inventory/customer-items")
      .then((d) => setItems(d.items || []))
      .catch((e) => notify(e.message || t("defectSection.customerStoreLoadFailed"), "error"))
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
    { title: t("defectSection.receiver"), key: "DecoderSerialNo" },
    { title: t("defectSection.chip"), key: "ChipSerialNo" },
    { title: t("defectSection.card"), key: "CardSerialNo" },
    { title: t("defectSection.model"), key: "Model_name" },
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
            {already ? t("defectSection.added") : t("defectSection.choose")}
          </button>
        );
      },
    },
  ];

  return (
    <Modal
      title={t("defectSection.pickReplacementTitle", { count: items.length })}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <div className="field" style={{ marginBottom: 10 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("defectSection.searchPlaceholder")}
        />
      </div>
      {loading ? (
        <div className="empty-hint">{t("common.loading")}</div>
      ) : (
        <Table
          columns={cols}
          rows={filtered}
          rowKey={(r) => r.ID}
          emptyText={t("defectSection.noDevicesCustomerStore")}
        />
      )}
    </Modal>
  );
}
function DefectRequestDetailModal({ record, onClose }) {
  const { t } = useTranslation();
  const [view, setView] = useState(null);
  // Same shape as مخزن العيب المصنعي in المخزون: row number instead of the
  // scanned ID (it's not a meaningful sequence here), plus الكرتونة, نوع
  // العطل and اسم العميل instead of الشريحة/البطاقة/الموديل, so a device
  // looks the same whether you're looking at it from the storage screen
  // or from this request's own detail view.
  const cols = [
    { title: "ID", key: "ID", render: (r, i) => i + 1 },
    { title: t("defectSection.carton"), key: "CartonSerialNo" },
    { title: t("defectSection.receiver"), key: "DecoderSerialNo" },
    { title: t("defectSection.defectType"), key: "DefectType" },
    { title: t("defectSection.customerName"), key: "CustomerName" },
  ];
  // Replacement devices are still-working stock pulled from مخزن خدمة
  // العملاء, not defective ones — so they keep the normal serial/model
  // columns instead of الكرتونة/نوع العطل.
  const replacementCols = [
    { title: "ID", key: "ID" },
    { title: t("defectSection.receiver"), key: "DecoderSerialNo" },
    { title: t("defectSection.chip"), key: "ChipSerialNo" },
    { title: t("defectSection.card"), key: "CardSerialNo" },
    { title: t("defectSection.model"), key: "Model_name" },
  ];
  return (
    <Modal
      title={t("defectSection.defectRecord", { id: record.req_id })}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <div className="details-grid" style={{ marginBottom: 12 }}>
        <div className="kv">
          <b>{t("defectSection.defectNo")}:</b> {record.req_id}
        </div>
        <div className="kv">
          <b>{t("defectSection.name")}:</b> {record.name}
        </div>
        <div className="kv">
          <b>{t("defectSection.type")}:</b> {record.beneficiary_type || "—"}
        </div>
        <div className="kv">
          <b>{t("defectSection.date")}:</b> {fmtTime(record.created_at)}
        </div>
        <div className="kv">
          <b>{t("defectSection.fromRequests")}:</b>{" "}
          {(record.source_requests || []).join("، ") || "—"}
        </div>
        <div className="kv">
          <b>{t("defectSection.notes")}:</b>{" "}
          {record.notes || t("defectSection.noNotes")}
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
        emptyText={t("defectSection.noDevices")}
      />
      {record.replacements_data && record.replacements_data.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>
            {t("defectSection.replacementDevicesCount", {
              count: record.replacements_data.length,
            })}
          </h4>
          <Table
            columns={replacementCols}
            rows={record.replacements_data}
            rowKey={(r) => r.ID}
            emptyText={t("defectSection.noReplacementDevices")}
          />
        </>
      ) : null}
      {view ? (
        <ImagesModal
          title={t("defectSection.notesImage")}
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </Modal>
  );
}
