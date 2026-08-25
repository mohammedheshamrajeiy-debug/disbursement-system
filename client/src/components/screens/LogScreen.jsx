import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, downloadUrl } from '../../api.js';
import { Card, Table, useNotify } from '../ui.jsx';
import ReturnsPanel from '../request/ReturnsPanel.jsx';
import DefectsPanel from '../request/DefectsPanel.jsx';

export default function LogScreen() {
  const notify = useNotify();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeSection, setActiveSection] = useState('log');

  const drawerItems = [
    { key: 'log', label: t('logScreen.operationsLog') },
    { key: 'return', label: t('logScreen.returns') },
    { key: 'defect', label: t('logScreen.defect') },
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
    if (!window.confirm(t('logScreen.confirmClearLog'))) return;
    await api('/log', { method: 'DELETE' });
    notify(t('logScreen.logCleared'));
    load();
    loadSummary();
  }

  const columns = [
    { title: '#', key: 'id' },
    { title: t('logScreen.time'), key: 'timestamp_display' },
    { title: t('logScreen.type'), key: 'type' },
    { title: t('logScreen.description'), key: 'description' },
  ];

  return (
    <div className="request-form-root">
      <div className="request-form-layout">
        <div className="request-form-content">
          {activeSection === 'return' ? (
            <ReturnsPanel title={t('logScreen.returnsTitle')} />
          ) : activeSection === 'defect' ? (
            <DefectsPanel title={t('logScreen.defect')} />
          ) : (
            <Card title={t('logScreen.operationsLog')}>
              {summary ? (
                <div className="info-bar">
                  <span>{t('logScreen.totalOperations')} <b>{summary.total || entries.length}</b></span>
                </div>
              ) : null}
              <div className="form-row">
                <button className="btn btn-primary" onClick={load}>
                  {t('common.update')}
                </button>
                <a className="btn" href={downloadUrl('/log/export')}>
                  {t('logScreen.exportExcel')}
                </a>
                <button className="btn btn-danger" onClick={clearLog}>
                  {t('logScreen.clearLog')}
                </button>
              </div>
              <div style={{ marginTop: 12 }}>
                <Table columns={columns} rows={entries} emptyText={t('logScreen.noOperations')} />
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
