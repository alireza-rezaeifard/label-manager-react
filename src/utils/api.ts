import type { RecordItem, CustomField } from '../types';

const API_BASE = '/api';

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
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
  login: (username: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  register: (username: string, password: string) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getRecords: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
    const q = qs.toString();
    return apiRequest(`/records${q ? '?' + q : ''}`);
  },

  getAllRecords: (workspaceId?: string | number) => {
    const qs = workspaceId ? `?workspace_id=${workspaceId}&limit=10000` : '?limit=10000';
    return apiRequest(`/records${qs}`).then((r: any) => r.records || r);
  },

  createRecord: (record: RecordItem) =>
    apiRequest('/records', { method: 'POST', body: JSON.stringify(record) }),

  updateRecord: (id: string, record: Partial<RecordItem>) =>
    apiRequest(`/records/${id}`, { method: 'PUT', body: JSON.stringify(record) }),

  deleteRecords: (ids: string[]) =>
    apiRequest('/records/batch', { method: 'DELETE', body: JSON.stringify({ ids }) }),

  reorder: (ids: string[]) =>
    apiRequest('/records/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  renumberRecords: (records: RecordItem[]) =>
    apiRequest('/records/renumber', { method: 'POST', body: JSON.stringify({ records }) }),

  backup: (workspaceId?: string | number) =>
    apiRequest(`/records/backup${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),

  restore: (records: RecordItem[], workspaceId?: string | number) =>
    apiRequest('/records/restore', { method: 'POST', body: JSON.stringify({ records, workspace_id: workspaceId }) }),

  uploadImage: (base64: string) =>
    apiRequest('/upload-image', { method: 'POST', body: JSON.stringify({ image: base64 }) }),

  getCustomFields: (workspaceId?: string | number) =>
    apiRequest(`/custom-fields${workspaceId ? `?workspace_id=${workspaceId}` : ''}`).catch(() => []),

  getMe: () =>
    apiRequest('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  getActivity: (workspaceId?: string | number) =>
    apiRequest(`/records/activity${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),

  getWorkspaces: () =>
    apiRequest('/workspaces'),

  createWorkspace: (name: string, description: string) =>
    apiRequest('/workspaces', { method: 'POST', body: JSON.stringify({ name, description }) }),

  inviteToWorkspace: (workspaceId: string | number, username: string) =>
    apiRequest('/workspaces/invite', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, username }) }),

  getWorkspaceMembers: (workspaceId: string | number) =>
    apiRequest(`/workspaces/${workspaceId}/members`),

  leaveWorkspace: (workspaceId: string | number) =>
    apiRequest(`/workspaces/${workspaceId}/leave`, { method: 'DELETE' }),

  changeMemberRole: (workspaceId: string | number, userId: string | number, role: string) =>
    apiRequest(`/workspaces/${workspaceId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  removeMember: (workspaceId: string | number, userId: string | number) =>
    apiRequest(`/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),

  transferOwnership: (workspaceId: string | number, userId: string | number) =>
    apiRequest(`/workspaces/${workspaceId}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ userId }) }),

  deleteWorkspace: (workspaceId: string | number) =>
    apiRequest(`/workspaces/${workspaceId}`, { method: 'DELETE' }),

  checkDuplicateCode: (queryString: string) =>
    apiRequest(`/records/check-code${queryString}`),

  getRecordVersions: (recordId: string | number) =>
    apiRequest(`/records/${recordId}/versions`),

  restoreRecordVersion: (recordId: string | number, versionId: string | number) =>
    apiRequest(`/records/${recordId}/versions/${versionId}/restore`, { method: 'POST' }),

  toggleFavorite: (recordId: string | number) =>
    apiRequest(`/records/${recordId}/favorite`, { method: 'POST' }),

  lockRecord: (recordId: string | number) =>
    apiRequest(`/records/${recordId}/lock`, { method: 'POST' }),

  unlockRecord: (recordId: string | number) =>
    apiRequest(`/records/${recordId}/unlock`, { method: 'POST' }),

  importFromUrl: (url: string, workspaceId?: string | number) =>
    apiRequest('/records/import-url', { method: 'POST', body: JSON.stringify({ url, workspace_id: workspaceId }) }),

  getTrash: (workspaceId?: string | number) =>
    apiRequest(`/records/trash${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),

  restoreFromTrash: (ids: string[]) =>
    apiRequest('/records/trash/restore', { method: 'POST', body: JSON.stringify({ ids }) }),

  permanentDelete: (ids: string[]) =>
    apiRequest('/records/trash/permanent', { method: 'DELETE', body: JSON.stringify({ ids }) }),
};
