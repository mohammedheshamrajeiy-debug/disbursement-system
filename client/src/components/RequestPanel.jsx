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
  console.log('labelName: Processing label:', label, 'type:', typeof label);
  const parts = text.split(" - ");
  if (parts.length < 2) {
    console.log('labelName: insufficient parts for label:', label, 'parts:', parts);
    return "";
  }
  const namePart = parts.slice(1).join(" - ");
  const cleaned = namePart.replace(/\s*\([^)]*\)\s*$/, "").trim();
  console.log('labelName: input:', label, 'parts:', parts, 'namePart:', namePart, 'cleaned:', cleaned);
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
  const [selectedName, setSelectedName] = useState("");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);

  const names = useMemo(() => {
    console.log('names useMemo: processing labels:', labels);
    const set = new Set();
    let validCount = 0;
    let invalidCount = 0;
    for (const label of labels) {
      const name = labelName(label);
      console.log('names useMemo: label:', label, '-> extracted name:', name);
      if (name !== "" && name !== null) {
        set.add(name);
        validCount++;
      } else {
        invalidCount++;
      }
    }
    console.log('names useMemo: valid names:', validCount, 'invalid/empty:', invalidCount, 'final set:', [...set]);
    const sorted = sortArabicFirst([...set]);
    console.log('names useMemo: after sortArabicFirst:', sorted);
    return sorted;
  }, [labels]);

  const filteredLabels = useMemo(() => {
    const q = selectedName.trim().toLowerCase();
    if (!q) return labels;
    const filtered = labels.filter((label) => labelName(label).toLowerCase().includes(q));
    console.log('filteredLabels useMemo: query:', q, 'input labels count:', labels.length, 'filtered count:', filtered.length);
    return filtered;
  }, [labels, selectedName]);

  async function loadLabels() {
    console.log('loadLabels: called with source:', source, 'stage:', stage, 'completed:', completed);
    const q = new URLSearchParams({ source });
    if (stage) q.set("stage", stage);
    if (completed) q.set("completed", "1");
    const queryString = q.toString();
    const url = `/requests/labels?${queryString}`;
    console.log('Fetching labels with params:', { source, stage, completed }, 'URL:', url);
    try {
      const data = await api(url);
      console.log('Labels API full response:', data);
      console.log('Labels API response labels array:', data.labels);
      console.log('Labels API response labels count:', data.labels ? data.labels.length : 0);

      // Log each label individually for detailed inspection
      if (data.labels && Array.isArray(data.labels)) {
        data.labels.forEach((label, index) => {
          console.log(`Labels API label[${index}]:`, label, 'type:', typeof label);
        });
      }

      setLabels(data.labels || []);
      setSelected("");
      setSelectedName("");
      setRequest(null);
    } catch (error) {
      console.error('Error fetching labels:', error);
      setLabels([]);
    }
  }

  useEffect(() => {
    console.log('RequestPanel useEffect triggered: source changed to:', source, 'stage:', stage, 'completed:', completed);
    loadLabels().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, stage, completed]);

  async function select(label) {
    console.log('select: called with label:', label);
    const id = labelId(label);
    console.log('select: labelId result:', id);
    setSelected(label);
    setLoading(true);
    try {
      const data = await api(`/requests/${encodeURIComponent(id)}`);
      console.log('select: API response for request:', data);
      setRequest({ ...data.req, display: data.display });
      if (onSelect) onSelect(data);
    } catch (error) {
      console.error('Error selecting request:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log('RequestPanel highlight useEffect: highlight:', highlight, 'labels length:', labels.length);
    if (!highlight || !labels.length) return;
    const hit = labels.find(
      (l) => labelId(l) === String(highlight).split(" - ")[0].trim(),
    );
    console.log('RequestPanel highlight useEffect: found hit:', hit);
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
