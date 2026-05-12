const API_BASE = '/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error('ارتباط با سرور برقرار نشد. مطمئن شوید سرور در حال اجراست (npm start در پوشه server)', { cause: err });
  }

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('auth-change'));
    throw new Error('نشست منقضی شده. لطفا دوباره وارد شوید');
  }
  if (!res.ok) {
    let msg = 'خطای سرور';
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export function getAuthUser() {
  try {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}

export const api = {
  login: (username, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  register: (username, password) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getRecords: () => apiRequest('/records'),

  createRecord: (record) =>
    apiRequest('/records', { method: 'POST', body: JSON.stringify(record) }),

  updateRecord: (id, record) =>
    apiRequest(`/records/${id}`, { method: 'PUT', body: JSON.stringify(record) }),

  deleteRecords: (ids) =>
    apiRequest('/records/batch', { method: 'DELETE', body: JSON.stringify({ ids }) }),

  reorder: (ids) =>
    apiRequest('/records/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  backup: () => apiRequest('/records/backup'),

  restore: (records) =>
    apiRequest('/records/restore', { method: 'POST', body: JSON.stringify({ records }) }),

  uploadImage: (base64) =>
    apiRequest('/upload-image', { method: 'POST', body: JSON.stringify({ image: base64 }) }),
};
