import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Card } from "./ui.jsx";
import { sortArabicFirst } from "../utils.js";
import { labelId } from "./RequestPanel.jsx";

function labelName(label) {
  const text = String(label);
  const parts = text.split(" - ");
  if (parts.length < 2) return "";
  const namePart = parts.slice(1).join(" - ");
  return namePart.replace(/\s*\(\d+\s+جهاز\)\s*$/, "").trim();
}

// Separate from "الطلبات المحفوظة" (which just displays any request
// read-only). This panel only lists requests that already finished this
// screen's stage, and handing a pick back to the caller so it can be loaded
// straight into the normal editable form to correct a mistake.
export default function EditRequestPanel({
  source = "all",
  stage,
  title = "تعديل",
  onSelect,
}) {
  const [labels, setLabels] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLabels() {
    const q = new URLSearchParams({ source, stage, completed: "1" });
    const data = await api(`/requests/labels?${q}`);
    setLabels(data.labels || []);
    setSelected("");
  }

  useEffect(() => {
    loadLabels().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, stage]);

  const names = useMemo(() => {
    const set = new Set();
    for (const label of labels) {
      const name = labelName(label);
      if (name) set.add(name);
    }
    return sortArabicFirst([...set]);
  }, [labels]);

  const filteredLabels = useMemo(() => {
    if (!selectedName) return labels;
    return labels.filter((label) => labelName(label) === selectedName);
  }, [labels, selectedName]);

  async function select(label) {
    const id = labelId(label);
    setSelected(label);
    setLoading(true);
    try {
      const data = await api(`/requests/${encodeURIComponent(id)}`);
      if (onSelect) onSelect(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title={title}>
      <div className="form-row">
        <div className="field" style={{ flex: 1 }}>
          <label>اختر الاسم</label>
          <select
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setSelected("");
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
          <label>اختر طلباً للتعديل</label>
          <select
            value={selected}
            onChange={(e) => e.target.value && select(e.target.value)}
          >
            <option value="">— اختر —</option>
            {filteredLabels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={() => loadLabels()}>
          تحديث
        </button>
      </div>
      {loading ? <div className="empty-hint">جاري التحميل...</div> : null}
      {!loading && !labels.length ? (
        <div className="empty-hint">لا توجد طلبات مكتملة لهذه المرحلة بعد</div>
      ) : null}
    </Card>
  );
}
