import jwt from 'jsonwebtoken';
import db from '../db.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  console.error('Set a strong secret via: set JWT_SECRET=your-strong-secret (Windows)');
  console.error('Or: export JWT_SECRET=your-strong-secret (Linux/Mac)');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const ROLE_HIERARCHY = { owner: 10, admin: 8, editor: 5, viewer: 1 };

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/** Require at least `minRole` in the workspace specified by `req.query.workspace_id` or `req.body.workspace_id` or the route param */
export function requireWorkspaceRole(minRole = 'viewer') {
  return (req, res, next) => {
    const wsId = parseInt(req.params.id || req.query.workspace_id || req.body.workspace_id, 10);
    if (!wsId) {
      return res.status(400).json({ error: 'workspace_id is required', code: 'MISSING_WORKSPACE' });
    }

    const membership = db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(wsId, req.user.id);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace', code: 'FORBIDDEN' });
    }

    const userLevel = ROLE_HIERARCHY[membership.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `This action requires "${minRole}" role or higher`,
        code: 'INSUFFICIENT_ROLE',
      });
    }

    req.workspaceRole = membership.role;
    next();
  };
}

/** Require at least `minRole` for a records route where workspace_id is extracted from the record itself */
export function requireRecordWorkspaceRole(minRole = 'viewer') {
  return (req, res, next) => {
    const recordId = parseInt(req.params.id, 10);
    if (!recordId) return res.status(400).json({ error: 'Record ID required', code: 'MISSING_ID' });

    const record = db.prepare('SELECT workspace_id FROM records WHERE id = ?').get(recordId);
    if (!record) return res.status(404).json({ error: 'Record not found', code: 'NOT_FOUND' });

    req.body.workspace_id = record.workspace_id;

    const membership = db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(record.workspace_id, req.user.id);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace', code: 'FORBIDDEN' });
    }

    const userLevel = ROLE_HIERARCHY[membership.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `This action requires "${minRole}" role or higher`,
        code: 'INSUFFICIENT_ROLE',
      });
    }

    req.workspaceRole = membership.role;
    next();
  };
}
