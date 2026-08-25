import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.jsx";
import { api } from "../../api.js";
import RequestDetails from "./RequestDetails.jsx";
import { Card } from "../ui.jsx";
import { sortArabicFirst } from "../../utils.js";

export function labelId(label) {
  return String(label).split(" - ")[0].trim();
}

function labelName(label) {
  const text = String(label);
  const parts = text.split(" - ");
  if (parts.length < 2) {
    return "";
  }
  const namePart = parts.slice(1).join(" - ");
  const cleaned = namePart.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return cleaned;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const names = useMemo(() => {
    const set = new Set();
    for (const label of labels) {
      const name = labelName(label);
      if (name !== "" && name !== null) {
        set.add(name);
      }
    }
    return sortArabicFirst([...set]);
  }, [labels]);

  const filteredLabels = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    // Clear errors when user starts typing
    if (query) {
      setSearchError("");
    }

    if (!query) return labels;

    const filtered = labels.filter((label) =>
      (labelName(label).toLowerCase().includes(query)) ||
      (labelId(label).toLowerCase().includes(query))
    );
    return filtered;
  }, [labels, searchTerm]);

  async function loadLabels() {
    const q = new URLSearchParams({ source });
    if (stage) q.set("stage", stage);
    if (completed) q.set("completed", "1");
    const queryString = q.toString();
    const url = `/requests/labels?${queryString}`;
    try {
      const data = await api(url);
      setLabels(data.labels || []);
      setSelected("");
      setRequest(null);
    } catch (error) {
      setLabels([]);
    }
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
    } catch (error) {
      console.error('Error selecting request:', error);
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
        <div className="field" style={{ flex: 3 }}>
          <label>{t("common.selectNameOrId")}</label>
          <input
            id="request-panel-search-input"
            aria-describedby={searchError ? "request-panel-search-error" : undefined}
            list="request-panel-names"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelected("");
              setRequest(null);
              setSearchError("");
            }}
            onBlur={() => {
              if (searchTerm.trim() && filteredLabels.length === 0) {
                setSearchError(t("common.noMatchesFound"));
              } else {
                setSearchError("");
              }
            }}
            placeholder={t("common.typeToSearch")}
          />
          <datalist id="request-panel-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {searchError && <p id="request-panel-search-error" className="field-error">{searchError}</p>}
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
