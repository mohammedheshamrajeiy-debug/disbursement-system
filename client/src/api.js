import i18n from './i18n.jsx';

export const TOKEN_KEY = 'disbursement_token';
export const USER_KEY = 'disbursement_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}
export function setStoredUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api(path, { method = 'GET', body, headers = {}, formData } = {}) {
  const opts = { method, headers: { ...headers, 'Accept-Language': i18n.language } };
  const token = getToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (formData) {
    opts.body = formData;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/';
    throw new Error(i18n.t('errors.sessionExpired'));
  }
  if (!res.ok) throw new Error((data && data.error) || i18n.t('errors.unexpected'));
  return data;
}

export async function uploadImages(files) {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return api('/upload', { method: 'POST', formData: fd });
}

export function downloadUrl(path) {
  const token = getToken();
  const sep = path.includes('?') ? '&' : '?';
  return token ? `/api${path}${sep}token=${encodeURIComponent(token)}` : `/api${path}`;
}
