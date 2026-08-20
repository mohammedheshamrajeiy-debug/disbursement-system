import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useLanguage } from '../i18n.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || t('errors.loginFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="form-row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
          <button type="button" className="btn btn-sm" onClick={toggleLanguage}>
            {t('langToggle')}
          </button>
        </div>
        <h1>{t('appTitle')}</h1>
        <div className="sub">{t('login.subtitle')}</div>
        <div className="form-grid">
          <div className="field">
            <label>{t('login.username')}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error ? <div className="toast error" style={{ marginTop: 10 }}>{error}</div> : null}
        <div className="form-row" style={{ marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ flex: 1 }}>
            {busy ? t('login.submitting') : t('login.submit')}
          </button>
        </div>
        <div className="login-hint">
          {t('login.hintTitle')}
          <br />
          {t('login.hintAdmin')} <b>admin</b> / <b>admin</b>
          <br />
          {t('login.hintStaff')} <b>cashier</b>, <b>accountant</b>, <b>warehouse</b>, <b>tech</b>,{' '}
          <b>customer_service</b> — {t('login.hintPasswordLabel')} <b>1234</b>
        </div>
      </form>
    </div>
  );
}
