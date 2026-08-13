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
  const opts = { method, headers: { ...headers } };
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
    throw new Error('انتهت الجلسة، سجّل الدخول مرة أخرى');
  }
  if (!res.ok) throw new Error((data && data.error) || 'حدث خطأ غير متوقع');
  return data;
}

export async function uploadImages(files) {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return api('/upload', { method: 'POST', formData: fd });
}

export function downloadUrl(path) {
  const token = getToken();
  return token ? `/api${path}?token=${encodeURIComponent(token)}` : `/api${path}`;
}
