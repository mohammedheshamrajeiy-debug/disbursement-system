import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.jsx";
import { api } from "../api.js";
import { Card, Table, fmtTime } from "./ui.jsx";
import { sortArabicFirst } from "../utils.js";
import ImagesModal from "./ImagesModal.jsx";

// Browse-only version of "العيب المصنعي": pick a name then a defect
// record, same two-step select pattern as الطلبات المحفوظة (RequestPanel),
// just backed by defect records instead of requests. No lookup/scan/submit
// here — actually processing a defect return still only happens from the
// الأجهزة tab.
export default function DefectsPanel({ title = i18n.t("defectsPanel.title") }) {
  const { t } = useTranslation();
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
    const q = selectedName.trim().toLowerCase();
    if (!q) return defects;
    return defects.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [defects, selectedName]);

  const selected = useMemo(
    () => filtered.find((r) => r.req_id === selectedId) || null,
    [filtered, selectedId],
  );

  const deviceCols = [
    { title: "ID", key: "ID" },
    { title: t("defectsPanel.receiver"), key: "DecoderSerialNo" },
    { title: t("defectsPanel.chip"), key: "ChipSerialNo" },
    { title: t("defectsPanel.card"), key: "CardSerialNo" },
    { title: t("defectsPanel.model"), key: "Model_name" },
  ];

  return (
    <Card title={title}>
      <div className="form-row">
        <div className="field" style={{ flex: 1 }}>
          <label>{t("common.selectName")}</label>
          <input
            list="defects-panel-names"
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setSelectedId("");
            }}
            placeholder={t("common.typeToSearch")}
          />
          <datalist id="defects-panel-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>{t("defectsPanel.selectDefect")}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">{t("common.select")}</option>
            {filtered.map((r) => (
              <option key={r.req_id} value={r.req_id}>
                {r.req_id} - {r.name} (
                {t("defectsPanel.deviceCount", {
                  count: (r.device_ids || []).length,
                })}
                )
              </option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={() => load()}>
          {t("common.update")}
        </button>
      </div>

      {loading ? (
        <div className="empty-hint">{t("common.loading")}</div>
      ) : selected ? (
        <>
          <div
            className="details-grid"
            style={{ marginTop: 12, marginBottom: 12 }}
          >
            <div className="kv">
              <b>{t("defectsPanel.defectNumber")}:</b> {selected.req_id}
            </div>
            <div className="kv">
              <b>{t("defectsPanel.name")}:</b> {selected.name}
            </div>
            <div className="kv">
              <b>{t("defectsPanel.date")}:</b> {fmtTime(selected.created_at)}
            </div>
            <div className="kv">
              <b>{t("defectsPanel.fromRequest")}:</b>{" "}
              {(selected.source_requests || []).join("، ") || "—"}
            </div>
            <div className="kv">
              <b>{t("defectsPanel.notes")}:</b>{" "}
              {selected.notes || t("defectsPanel.noNotes")}
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
            emptyText={t("defectsPanel.noDevices")}
          />
        </>
      ) : (
        <div className="empty-hint" style={{ marginTop: 12 }}>
          {t("defectsPanel.selectDefectHint")}
        </div>
      )}

      {view ? (
        <ImagesModal
          title={t("defectsPanel.notesImage")}
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </Card>
  );
}
