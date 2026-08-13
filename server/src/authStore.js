import crypto from 'crypto';

const sessions = new Map();

export function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    username: user.username,
    role: user.role,
    tabs: user.tabs,
  });
  return token;
}

export function getSession(token) {
  return sessions.get(token) || null;
}

export function deleteSession(token) {
  sessions.delete(token);
}
