import { createContext, useContext, useEffect, useState } from "react";
import i18n from "../i18n.jsx";

export function Card({ title, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Table({
  columns,
  rows,
  onRowClick,
  selectedId,
  emptyText = i18n.t("common.noData"),
  rowKey = (r, i) => i,
  columnClass,
}) {
  if (!rows.length) {
    return <div className="empty-hint">{emptyText}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rid = rowKey(r, i);
            return (
              <tr
                key={typeof rid === "object" ? i : rid}
                className={
                  selectedId != null && selectedId === rid ? "selected" : ""
                }
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((c, ci) => (
                  <td
                    key={ci}
                    className={columnClass ? columnClass(r, c) : undefined}
                  >
                    {c.render ? c.render(r, i, ci) : r[c.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onClose, footer, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={wide ? { minWidth: "70vw" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function notify(message, type = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useNotify() {
  return useContext(ToastContext);
}

export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: () => setLoading(true) };
}

export function fmtTime(ts) {
  if (!ts) return "";
  return String(ts).slice(0, 19).replace("T", " ");
}

export function money(n) {
  if (n == null || n === "") return "";
  return Number(n).toLocaleString("en-US");
}

export function isImageUrl(u) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(u);
}
export function isPdfUrl(u) {
  return /\.pdf$/i.test(u);
}
