import { useState } from 'react';
import { useAuth } from '../../auth.jsx';
import { useLanguage } from '../../i18n.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message ?? t('errors.loginFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="form-row language-toggle">
          <button type="button" className="btn btn-sm" onClick={toggleLanguage}>
            {t('langToggle')}
          </button>
        </div>
        <h1>{t('appTitle')}</h1>
        <div className="sub">{t('login.subtitle')}</div>
        <div className="login-thesis">
          {t('login.thesis', { defaultValue: 'Managing resources, tracking goods, and ensuring transparent disbursement processes.' })}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="username">{t('login.username')}</label>
            <input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              placeholder={t('login.username')}
              aria-describedby="username-error"
            />
            {error && <p id="username-error" className="field-error">{error}</p>}
          </div>
          <div className="field">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('login.password')}
              aria-describedby="password-error"
            />
            {error && <p id="password-error" className="field-error">{error}</p>}
          </div>
        </div>
        <div className="form-row submit-button">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
          >
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
