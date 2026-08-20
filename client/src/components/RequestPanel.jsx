import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.jsx";
import { api } from "../api.js";
import RequestDetails from "./RequestDetails.jsx";
import { Card } from "./ui.jsx";
import { sortArabicFirst } from "../utils.js";

export function labelId(label) {
  return String(label).split(" - ")[0].trim();
}

function labelName(label) {
  const text = String(label);
  const parts = text.split(" - ");
  if (parts.length < 2) return "";
  const namePart = parts.slice(1).join(" - ");
  return namePart.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export default function RequestPanel({
  source,
  stage,
  title = i18n.t("requestPanel.title"),
  sections,
  onSelect,
  highlight,
  showDetails = true,
  completed = false,
  hideFinancial = false,
}) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);

  const names = useMemo(() => {
    const set = new Set();
    for (const label of labels) {
      const name = labelName(label);
      if (name) set.add(name);
    }
    return sortArabicFirst([...set]);
  }, [labels]);

  const filteredLabels = useMemo(() => {
    const q = selectedName.trim().toLowerCase();
    if (!q) return labels;
    return labels.filter((label) => labelName(label).toLowerCase().includes(q));
  }, [labels, selectedName]);

  async function loadLabels() {
    const q = new URLSearchParams({ source });
    if (stage) q.set("stage", stage);
    if (completed) q.set("completed", "1");
    const data = await api(`/requests/labels?${q}`);
    setLabels(data.labels || []);
    setSelected("");
    setSelectedName("");
    setRequest(null);
  }

  useEffect(() => {
    loadLabels().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, stage, completed]);

  async function select(label) {
    const id = labelId(label);
    setSelected(label);
    setLoading(true);
    try {
      const data = await api(`/requests/${encodeURIComponent(id)}`);
      setRequest({ ...data.req, display: data.display });
      if (onSelect) onSelect(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!highlight || !labels.length) return;
    const hit = labels.find(
      (l) => labelId(l) === String(highlight).split(" - ")[0].trim(),
    );
    if (hit) select(hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, labels.length]);

  return (
    <Card title={title}>
      <div className="form-row">
        <div className="field" style={{ flex: 1 }}>
          <label>{t("common.selectName")}</label>
          <input
            list="request-panel-names"
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setSelected("");
              setRequest(null);
            }}
            placeholder={t("common.typeToSearch")}
          />
          <datalist id="request-panel-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>{t("requestPanel.selectRequest")}</label>
          <select
            value={selected}
            onChange={(e) => e.target.value && select(e.target.value)}
          >
            <option value="">{t("common.select")}</option>
            {filteredLabels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={() => loadLabels()}>
          {t("common.update")}
        </button>
      </div>
      {loading ? (
        <div className="empty-hint">{t("common.loading")}</div>
      ) : showDetails ? (
        <RequestDetails
          request={request}
          sections={sections}
          hideFinancial={hideFinancial}
        />
      ) : null}
    </Card>
  );
}
