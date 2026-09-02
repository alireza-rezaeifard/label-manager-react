import db from '../db.js';
import { AppError } from '../errors.js';

export const ROLE_HIERARCHY = { owner: 10, admin: 8, editor: 5, viewer: 1 };

/** Returns the user's role in the workspace, or null if not a member. */
export function getWorkspaceRole(workspaceId, userId) {
  const membership = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, userId);
  return membership?.role || null;
}

/** Throws 403 unless the user holds at least `minRole` in the workspace. Returns the actual role. */
export function assertWorkspaceRole(workspaceId, userId, minRole = 'viewer') {
  const role = getWorkspaceRole(workspaceId, userId);
  if (!role) throw new AppError('Not a member of this workspace', 403, 'FORBIDDEN');
  if ((ROLE_HIERARCHY[role] || 0) < (ROLE_HIERARCHY[minRole] || 0)) {
    throw new AppError(`This action requires "${minRole}" role or higher`, 403, 'INSUFFICIENT_ROLE');
  }
  return role;
}

/**
 * Loads a record and verifies user → membership → role → resource ownership.
 * Throws 404 (not found) or 403 (not a member / insufficient role).
 * Returns { record, role }.
 */
export function loadRecordForUser(recordId, userId, minRole = 'viewer') {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId);
  if (!record) throw new AppError('Record not found', 404, 'NOT_FOUND');
  const role = assertWorkspaceRole(record.workspace_id, userId, minRole);
  return { record, role };
}

/**
 * Resolves the target workspace for a write operation.
 * Explicit workspace_id wins; otherwise fall back to the user's single
 * membership; legacy fallback: workspace 1 if the user is a member.
 * Never allows writing into a workspace the user is not a member of.
 */
export function resolveWorkspaceId(req) {
  const raw = req.body?.workspace_id ?? req.query?.workspace_id;
  if (raw !== undefined && raw !== null && raw !== '') {
    const id = parseInt(raw, 10);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid workspace_id', 400, 'INVALID_WORKSPACE');
    }
    return id;
  }

  const memberships = db.prepare(
    'SELECT workspace_id FROM workspace_members WHERE user_id = ?'
  ).all(req.user.id);
  if (memberships.length === 1) return memberships[0].workspace_id;
  if (memberships.some((m) => m.workspace_id === 1)) return 1; // legacy default

  throw new AppError('workspace_id is required', 400, 'MISSING_WORKSPACE');
}