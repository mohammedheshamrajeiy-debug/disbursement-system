import { Router } from 'express';
import { createSession, getSession, deleteSession } from '../authStore.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token && req.query && req.query.token) token = String(req.query.token);
  const session = token ? getSession(token) : null;
  if (!session) {
    return res.status(401).json({ error: 'غير مصرح به - يجب تسجيل الدخول' });
  }
  req.session = session;
  req.token = token;
  next();
}

// Beyond "is logged in", some actions (like actually processing a return)
// should only be doable by whoever holds the matching tab permission —
// everyone else can still view the data (e.g. the returns banner on a
// request), they just can't perform the action itself. Mount this after
// authRequired so req.session is already set.
export function requireTab(tabKey) {
  return (req, res, next) => {
    const tabs = (req.session && req.session.tabs) || [];
    if (!tabs.includes(tabKey)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية القيام بهذا الإجراء' });
    }
    next();
  };
}

export function authRoutes(dm) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    const user = dm.validateLogin(username, password);
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    const token = createSession(user);
    res.json({ token, user });
  });

  router.get('/me', authRequired, (req, res) => {
    const user = dm.users[req.session.username];
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    res.json({ user: { username: req.session.username, ...user } });
  });

  router.post('/logout', (req, res) => {
    if (req.token) deleteSession(req.token);
    res.json({ ok: true });
  });

  return router;
}
