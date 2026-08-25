import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, uploadImages } from "../../../api.js";
import { Card, Modal, Table, useNotify, fmtTime } from "../../ui.jsx";
import ImagesModal from "../../request/ImagesModal.jsx";

export default function ReturnSection() {
  const { t } = useTranslation();
  const notify = useNotify();
  const [names, setNames] = useState([]);
  const [name, setName] = useState("");
  // وكيل → طلب الصرف, عميل → طلب العميل. Everything below (names list,
  // carton/serial lookups) is scoped to whichever one is picked, so a
  // وكيل return can't accidentally pull in — or get confused with — a
  // same-named عميل, and vice versa.
  const [beneficiaryType, setBeneficiaryType] = useState("disbursement");
  const [cartonNo, setCartonNo] = useState("");
  const [code, setCode] = useState("");
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
  }

  function pickName(n) {
    setName(n);
    setShowNamesList(false);
    notify(t("returnSection.nameSelected", { name: n }));
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
      notify(t("returnSection.deviceAlreadyAdded"), "error");
      return;
    }

    setMatches((prev) => [...prev, ...newOnes]);
    notify(
      matched
        ? t("returnSection.addedDevices", { count: newOnes.length, value })
        : t("returnSection.addedDevice", { value }),
    );
  }

  // رقم الكرتونة: pulls in every device on record under this carton for
  // this person. Requires an actual match — a carton number on its own
  // isn't a device, so there's nothing sensible to fall back to.
  async function searchCarton() {
    if (!name.trim()) return notify(t("returnSection.typeBeneficiaryNameFirst"), "error");
    const value = cartonNo.trim();
    if (!value) return notify(t("returnSection.enterCartonNo"), "error");
    if (usedCodes.has(value)) {
      notify(t("returnSection.codeAlreadyEntered", { value }), "error");
      return;
    }

    const q = new URLSearchParams({
      name: name.trim(),
      carton: value,
      source: beneficiaryType,
    });
    const d = await api(`/returns/lookup?${q}`);
    const items = d.items || [];
    if (!items.length) {
      notify(t("returnSection.noDevicesForCarton"), "error");
      return;
    }
    addItems(items, value, true);
    setCartonNo("");
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
      notify(t("returnSection.typeBeneficiaryNameFirst"), "error");
      return;
    }
    if (usedCodes.has(value)) {
      notify(t("returnSection.codeAlreadyEntered", { value }), "error");
      return;
    }

    let items = [];
    try {
      const q = new URLSearchParams({
        name: name.trim(),
        carton: value,
        source: beneficiaryType,
      });
      const d = await api(`/returns/lookup?${q}`);
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
    notify(t("returnSection.deviceRemoved", { id }));
  }

  async function submitReturn() {
    if (!name.trim()) return notify(t("returnSection.typeBeneficiaryName"), "error");
    if (!matches.length) return notify(t("returnSection.addAtLeastOneDevice"), "error");
    setBusy(true);
    try {
      const d = await api("/returns", {
        method: "POST",
        body: {
          name: name.trim(),
          notes,
          notes_image: notesImage,
          devices: matches,
          source: beneficiaryType,
        },
      });

      notify(
        t("returnSection.created", {
          count: d.returned,
          reqId: d.return_req_id,
          storage: t("storage.storage_return"),
        }) +
          (d.affected_requests && d.affected_requests.length
            ? t("returnSection.createdFromRequests", {
                requests: d.affected_requests.join("، "),
              })
            : ""),
      );
      setLastResult(d);
      setMatches([]);
      setUsedCodes(new Set());
      setCartonNo("");
      setCode("");
      setNotes("");
      setNotesImage("");
    } catch (e) {
      notify(e.message || t("returnSection.failedToComplete"), "error");
    } finally {
      setBusy(false);
    }
  }

  const [showLog, setShowLog] = useState(false);
  const [viewReturn, setViewReturn] = useState(null);

  return (
    <Card title={t("returnSection.title")}>
      {lastResult ? (
        <div className="empty-hint" style={{ marginBottom: 8, fontWeight: 600 }}>
          {t("returnSection.lastReturn", {
            count: lastResult.returned,
            reqId: lastResult.return_req_id,
          })}
          {lastResult.affected_requests && lastResult.affected_requests.length
            ? t("returnSection.createdFromRequests", {
                requests: lastResult.affected_requests.join("، "),
              })
            : ""}
        </div>
      ) : null}

      <div className="form-grid">
        <div className="field">
          <label>{t("returnSection.beneficiaryType")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <button
              type="button"
              className={`btn btn-sm ${beneficiaryType === "disbursement" ? "btn-primary" : ""}`}
              onClick={() => switchBeneficiaryType("disbursement")}
            >
              {t("returnSection.agent")}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${beneficiaryType === "customer" ? "btn-primary" : ""}`}
              onClick={() => switchBeneficiaryType("customer")}
            >
              {t("returnSection.customer")}
            </button>
          </div>
        </div>
        <div className="field">
          <label>{t("returnSection.beneficiaryName")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              list="return-names-list"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("returnSection.namePlaceholder")}
            />
            <datalist id="return-names-list">
              {names.map((n, i) => (
                <option key={i} value={n} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowNamesList(true)}
            >
              {t("returnSection.list")}
            </button>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>{t("returnSection.notes")}</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("returnSection.notesImage")}</label>
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
          <label>{t("returnSection.cartonLabel")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              value={cartonNo}
              onChange={(e) => setCartonNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                searchCarton();
              }}
              placeholder={t("returnSection.cartonNoPlaceholder")}
            />
            <button type="button" className="btn" onClick={searchCarton}>
              {t("common.search")}
            </button>
          </div>
        </div>
        <div className="field">
          <label>{t("returnSection.scanDeviceLabel")}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              ref={codeRef}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              placeholder={t("returnSection.scanPlaceholder")}
            />
            <button type="button" className="btn" onClick={() => addCode(code)}>
              {t("common.add")}
            </button>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <button className="btn btn-sm" onClick={() => setShowLog(true)}>
          {t("returnSection.returnRequestsLog")}
        </button>
        {matches.length ? (
          <button
            className="btn"
            onClick={() => {
              setMatches([]);
              setUsedCodes(new Set());
            }}
          >
            {t("returnSection.clearList")}
          </button>
        ) : null}
      </div>

      {matches.length ? (
        <>
          <h4 style={{ marginTop: 14 }}>
            {t("returnSection.addedDevicesCount", { count: matches.length })}
          </h4>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t("returnSection.requestNo")}</th>
                  <th>{t("returnSection.receiver")}</th>
                  <th>{t("returnSection.chip")}</th>
                  <th>{t("returnSection.card")}</th>
                  <th>{t("returnSection.model")}</th>
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
          <div className="form-row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" disabled={busy} onClick={submitReturn}>
              {busy ? t("returnSection.returning") : t("returnSection.registerReturn")}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-hint" style={{ marginTop: 12 }}>
          {t("returnSection.emptyHint")}
        </div>
      )}

      {showLog ? (
        <ReturnRequestsLogModal
          onClose={() => setShowLog(false)}
          onOpen={(r) => {
            setShowLog(false);
            setViewReturn(r);
          }}
        />
      ) : null}

      {viewReturn ? (
        <ReturnRequestDetailModal
          record={viewReturn}
          onClose={() => setViewReturn(null)}
        />
      ) : null}

      {notesView ? (
        <ImagesModal
          title={t("returnSection.notesImage")}
          urls={notesView}
          onClose={() => setNotesView(null)}
        />
      ) : null}

      {showNamesList ? (
        <Modal
          title={t("returnSection.beneficiariesList")}
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
              { title: t("returnSection.name"), render: (n) => n },
              {
                title: "",
                render: (n) => (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => pickName(n)}
                  >
                    {t("returnSection.choose")}
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

function ReturnRequestsLogModal({ onClose, onOpen }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/returns/requests")
      .then((d) => setRows(d.requests || []))
      .catch(() => {});
  }, []);

  const cols = [
    { title: t("returnSection.no"), key: "req_id" },
    { title: t("returnSection.name"), key: "name" },
    { title: t("returnSection.date"), render: (r) => fmtTime(r.created_at) },
    {
      title: t("returnSection.deviceCount"),
      render: (r) => (r.device_ids || []).length,
    },
    {
      title: t("returnSection.fromRequests"),
      render: (r) => (r.source_requests || []).join("، ") || "—",
    },
    { title: t("returnSection.notes"), render: (r) => r.notes || "—" },
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
      title={t("returnSection.returnRequestsLog")}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <Table columns={cols} rows={rows} emptyText={t("returnSection.noReturnRequests")} />
    </Modal>
  );
}

function ReturnRequestDetailModal({ record, onClose }) {
  const { t } = useTranslation();
  const [view, setView] = useState(null);
  const cols = [
    { title: "ID", key: "ID" },
    { title: t("returnSection.receiver"), key: "DecoderSerialNo" },
    { title: t("returnSection.chip"), key: "ChipSerialNo" },
    { title: t("returnSection.card"), key: "CardSerialNo" },
    { title: t("returnSection.model"), key: "Model_name" },
  ];
  return (
    <Modal
      title={t("returnSection.returnRecord", { id: record.req_id })}
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
          <b>{t("returnSection.returnNo")}:</b> {record.req_id}
        </div>
        <div className="kv">
          <b>{t("returnSection.name")}:</b> {record.name}
        </div>
        <div className="kv">
          <b>{t("returnSection.type")}:</b> {record.beneficiary_type || "—"}
        </div>
        <div className="kv">
          <b>{t("returnSection.date")}:</b> {fmtTime(record.created_at)}
        </div>
        <div className="kv">
          <b>{t("returnSection.fromRequests")}:</b>{" "}
          {(record.source_requests || []).join("، ") || "—"}
        </div>
        <div className="kv">
          <b>{t("returnSection.notes")}:</b>{" "}
          {record.notes || t("returnSection.noNotes")}
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
        emptyText={t("returnSection.noDevices")}
      />
      {view ? (
        <ImagesModal
          title={t("returnSection.notesImage")}
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </Modal>
  );
}
