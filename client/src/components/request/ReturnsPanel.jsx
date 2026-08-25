import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.jsx";
import { api } from "../../api.js";
import { Card, Table, fmtTime } from "../ui.jsx";
import { sortArabicFirst } from "../../utils.js";
import ImagesModal from "./ImagesModal.jsx";

// Browse-only version of "المرتجع": unified search for name or ID, same pattern as
// الطلبات المحفوظة (RequestPanel), just backed by return records instead of requests.
// No lookup/scan/submit here — actually processing a return still only happens from
// the الأجهزة tab.
export default function ReturnsPanel({ title = i18n.t("returnsPanel.title") }) {
  const { t } = useTranslation();
  const [returns, setReturns] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/returns/requests");
      setReturns(d.requests || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const names = useMemo(() => {
    const set = new Set();
    for (const r of returns) if (r.name) set.add(r.name);
    return sortArabicFirst([...set]);
  }, [returns]);

  const filteredReturns = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    // Clear selection when search changes
    if (query) {
      setSelectedReturn(null);
    }

    if (!query) return returns;

    return returns.filter((r) =>
      (r.name && r.name.toLowerCase().includes(query)) ||
      r.req_id.toLowerCase().includes(query)
    );
  }, [returns, searchTerm]);

  const deviceCols = [
    { title: "ID", key: "ID" },
    { title: t("returnsPanel.receiver"), key: "DecoderSerialNo" },
    { title: t("returnsPanel.chip"), key: "ChipSerialNo" },
    { title: t("returnsPanel.card"), key: "CardSerialNo" },
    { title: t("returnsPanel.model"), key: "Model_name" },
  ];

  return (
    <Card title={title}>
      <div className="form-row">
        <div className="field" style={{ flex: 3 }}>
          <label>{t("common.selectNameOrId")}</label>
          <input
            id="returns-panel-search-input"
            list="returns-panel-names"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("common.typeToSearch")}
          />
          <datalist id="returns-panel-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>{t("returnsPanel.selectReturn")}</label>
          <select
            value={selectedReturn ? selectedReturn.req_id : ""}
            onChange={(e) => {
              const selected = filteredReturns.find(r => r.req_id === e.target.value);
              setSelectedReturn(selected || null);
            }}
          >
            <option value="">{t("common.select")}</option>
            {filteredReturns.map((r) => (
              <option key={r.req_id} value={r.req_id}>
                {r.req_id} - {r.name} (
                {t("returnsPanel.devicesCount", {
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
      ) : selectedReturn ? (
        <>
          <div
            className="details-grid"
            style={{ marginTop: 12, marginBottom: 12 }}
          >
            <div className="kv">
              <b>{t("returnsPanel.returnNumber")}</b> {selectedReturn.req_id}
            </div>
            <div className="kv">
              <b>{t("returnsPanel.name")}</b> {selectedReturn.name}
            </div>
            <div className="kv">
              <b>{t("returnsPanel.date")}</b> {fmtTime(selectedReturn.created_at)}
            </div>
            <div className="kv">
              <b>{t("returnsPanel.fromRequest")}</b>{" "}
              {(selectedReturn.source_requests || []).join("، ") || "—"}
            </div>
            <div className="kv">
              <b>{t("returnsPanel.notes")}</b>{" "}
              {selectedReturn.notes || t("returnsPanel.noNotes")}
            </div>
          </div>
          {selectedReturn.notes_image ? (
            <div className="img-thumbs" style={{ marginBottom: 12 }}>
              <img
                className="img-thumb"
                src={selectedReturn.notes_image}
                onClick={() => setView([selectedReturn.notes_image])}
                alt=""
              />
            </div>
          ) : null}
          <Table
            columns={deviceCols}
            rows={selectedReturn.devices_data || []}
            rowKey={(r) => r.ID}
            emptyText={t("returnsPanel.noDevices")}
          />
        </>
      ) : (
        <div className="empty-hint" style={{ marginTop: 12 }}>
          {t("returnsPanel.selectReturnForDetails")}
        </div>
      )}

      {view ? (
        <ImagesModal
          title={t("returnsPanel.notesImage")}
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </Card>
  );
}
