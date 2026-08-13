import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
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
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>نظام إدارة الصرف والمخزون</h1>
        <div className="sub">تسجيل الدخول</div>
        <div className="form-grid">
          <div className="field">
            <label>اسم المستخدم</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>كلمة المرور</label>
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
            {busy ? '...' : 'دخول'}
          </button>
        </div>
        <div className="login-hint">
          الحسابات الافتراضية:
          <br />
          مدير النظام: <b>admin</b> / <b>admin</b>
          <br />
          موظفون: <b>cashier</b>, <b>accountant</b>, <b>warehouse</b>, <b>tech</b>, <b>customer_service</b> — كلمة المرور <b>1234</b>
        </div>
      </form>
    </div>
  );
}
