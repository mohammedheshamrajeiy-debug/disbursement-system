import { useEffect, useState } from 'react';
import { api, downloadUrl } from '../api.js';
import { Card, Table, useNotify } from '../components/ui.jsx';
import ReturnsPanel from '../components/ReturnsPanel.jsx';
import DefectsPanel from '../components/DefectsPanel.jsx';

export default function LogScreen() {
  const notify = useNotify();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeSection, setActiveSection] = useState('log');

  const drawerItems = [
    { key: 'log', label: 'سجل العمليات' },
    { key: 'return', label: 'المرتجع' },
    { key: 'defect', label: 'العيب المصنعي' },
  ];

  async function load() {
    const d = await api('/log');
    setEntries(d.entries || []);
  }
  async function loadSummary() {
    const d = await api('/log/summary');
    setSummary(d);
  }

  useEffect(() => {
    load().catch(() => {});
    loadSummary().catch(() => {});
  }, []);

  async function clearLog() {
    if (!window.confirm('مسح سجل العمليات بالكامل؟')) return;
    await api('/log', { method: 'DELETE' });
    notify('تم مسح السجل');
    load();
    loadSummary();
  }

  const columns = [
    { title: '#', key: 'id' },
    { title: 'الوقت', key: 'timestamp_display' },
    { title: 'النوع', key: 'type' },
    { title: 'الوصف', key: 'description' },
  ];

  return (
    <div className="request-form-root">
      <div className="request-form-layout">
        <div className="request-form-content">
          {activeSection === 'return' ? (
            <ReturnsPanel title="المرتجعات" />
          ) : activeSection === 'defect' ? (
            <DefectsPanel title="العيب المصنعي" />
          ) : (
            <Card title="سجل العمليات">
              {summary ? (
                <div className="info-bar">
                  <span>إجمالي العمليات: <b>{summary.total || entries.length}</b></span>
                </div>
              ) : null}
              <div className="form-row">
                <button className="btn btn-primary" onClick={load}>
                  تحديث
                </button>
                <a className="btn" href={downloadUrl('/log/export')}>
                  تصدير Excel
                </a>
                <button className="btn btn-danger" onClick={clearLog}>
                  مسح السجل
                </button>
              </div>
              <div style={{ marginTop: 12 }}>
                <Table columns={columns} rows={entries} emptyText="لا توجد عمليات مسجلة" />
              </div>
            </Card>
          )}
        </div>
        <div className="request-form-sidebar">
          {drawerItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`accordion-btn ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
