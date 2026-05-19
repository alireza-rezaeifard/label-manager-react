const API_BASE = '/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(options as any).headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error('ارتباط با سرور برقرار نشد. مطمئن شوید سرور در حال اجراست (npm start در پوشه server)', { cause: err });
  }

  if (!res.ok) {
    let msg = res.status === 401 ? 'نشست منقضی شده. لطفا دوباره وارد شوید' : 'خطای سرور';
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch { /* ignore parse error */ }
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new Event('auth-change'));
    }
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

  getRecords: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
    const q = qs.toString();
    return apiRequest(`/records${q ? '?' + q : ''}`);
  },

  getAllRecords: (workspaceId) => {
    const qs = workspaceId ? `?workspace_id=${workspaceId}&limit=10000` : '?limit=10000';
    return apiRequest(`/records${qs}`).then(r => r.records || r);
  },

  createRecord: (record) =>
    apiRequest('/records', { method: 'POST', body: JSON.stringify(record) }),

  updateRecord: (id, record) =>
    apiRequest(`/records/${id}`, { method: 'PUT', body: JSON.stringify(record) }),

  deleteRecords: (ids) =>
    apiRequest('/records/batch', { method: 'DELETE', body: JSON.stringify({ ids }) }),

  reorder: (ids) =>
    apiRequest('/records/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  backup: (workspaceId) =>
    apiRequest(`/records/backup${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),

  restore: (records, workspaceId) =>
    apiRequest('/records/restore', { method: 'POST', body: JSON.stringify({ records, workspace_id: workspaceId }) }),

  uploadImage: (base64) =>
    apiRequest('/upload-image', { method: 'POST', body: JSON.stringify({ image: base64 }) }),

  getActivity: (workspaceId) =>
    apiRequest(`/records/activity${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),

  getWorkspaces: () =>
    apiRequest('/workspaces'),

  createWorkspace: (name, description) =>
    apiRequest('/workspaces', { method: 'POST', body: JSON.stringify({ name, description }) }),

  inviteToWorkspace: (workspaceId, username) =>
    apiRequest('/workspaces/invite', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, username }) }),

  getWorkspaceMembers: (workspaceId) =>
    apiRequest(`/workspaces/${workspaceId}/members`),

  leaveWorkspace: (workspaceId) =>
    apiRequest(`/workspaces/${workspaceId}/leave`, { method: 'DELETE' }),

  changeMemberRole: (workspaceId, userId, role) =>
    apiRequest(`/workspaces/${workspaceId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  removeMember: (workspaceId, userId) =>
    apiRequest(`/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),

  transferOwnership: (workspaceId, userId) =>
    apiRequest(`/workspaces/${workspaceId}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ userId }) }),

  deleteWorkspace: (workspaceId) =>
    apiRequest(`/workspaces/${workspaceId}`, { method: 'DELETE' }),

  checkDuplicateCode: (queryString) =>
    apiRequest(`/records/check-code${queryString}`),

  getMe: () =>
    apiRequest('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  getCustomFields: (workspaceId) =>
    apiRequest(`/custom-fields${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),

  createCustomField: (field) =>
    apiRequest('/custom-fields', { method: 'POST', body: JSON.stringify(field) }),

  batchSaveCustomFields: (fields, workspaceId) =>
    apiRequest('/custom-fields/batch', { method: 'POST', body: JSON.stringify({ fields, workspace_id: workspaceId }) }),

  updateCustomField: (key, field, workspaceId) =>
    apiRequest(`/custom-fields/${encodeURIComponent(key)}${workspaceId ? `?workspace_id=${workspaceId}` : ''}`, { method: 'PUT', body: JSON.stringify({ ...field, workspace_id: workspaceId }) }),

  deleteCustomField: (key, workspaceId) =>
    apiRequest(`/custom-fields/${encodeURIComponent(key)}${workspaceId ? `?workspace_id=${workspaceId}` : ''}`, { method: 'DELETE' }),
};
