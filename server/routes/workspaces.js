import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireWorkspaceRole } from '../middleware/auth.js';
import { AppError } from '../errors.js';

const ROLE_HIERARCHY = { owner: 10, admin: 8, editor: 5, viewer: 1 };
const VALID_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*, wm.role as member_role,
      (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
    ORDER BY w.created_at ASC
  `).all(req.user.id);

  res.json(workspaces);
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  const result = db.prepare('INSERT INTO workspaces (name, description, created_by) VALUES (?, ?, ?)').run(
    name.trim(), description || '', req.user.id
  );

  db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(
    result.lastInsertRowid, req.user.id, 'owner'
  );

  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(result.lastInsertRowid);
  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)').run(
    req.user.id, 'create_workspace', `Created workspace "${name}"`
  );

  res.status(201).json({ ...workspace, member_role: 'owner', member_count: 1 });
});

router.post('/invite', (req, res) => {
  const { workspace_id, username } = req.body;
  if (!workspace_id || !username) {
    return res.status(400).json({ error: 'Workspace ID and username are required' });
  }

  const membership = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspace_id, req.user.id);

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return res.status(403).json({ error: 'Only workspace owners and admins can invite' });
  }

  const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const alreadyMember = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspace_id, targetUser.id);

  if (alreadyMember) {
    return res.status(409).json({ error: 'User is already a member' });
  }

  db.prepare(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
  ).run(workspace_id, targetUser.id, 'editor');

  db.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').run(
    req.user.id, workspace_id, 'invite', `Invited "${username}" to workspace as editor`
  );

  res.json({ ok: true, message: `"${username}" invited to workspace as editor` });
});

router.get('/:id/members', (req, res) => {
  const { id } = req.params;

  const membership = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(id, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }

  const members = db.prepare(`
    SELECT u.id, u.username, u.role as user_role, wm.role as member_role, wm.joined_at
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
    ORDER BY wm.joined_at ASC
  `).all(id);

  res.json(members);
});

router.delete('/:id/leave', (req, res) => {
  const { id } = req.params;

  const membership = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(id, req.user.id);

  if (!membership) {
    return res.status(404).json({ error: 'Not a member' });
  }

  if (membership.role === 'owner') {
    const ownerCount = db.prepare(
      'SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND role = ?'
    ).get(id, 'owner');

    if (ownerCount.count <= 1) {
      return res.status(400).json({ error: 'Cannot leave: you are the only owner. Transfer ownership first.' });
    }
  }

  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(id, req.user.id);
  res.json({ ok: true });
});

router.put('/:id/members/:userId/role', (req, res) => {
  const { id, userId } = req.params;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const callerRole = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), req.user.id);

  if (!callerRole) return res.status(403).json({ error: 'Not a member' });
  if ((ROLE_HIERARCHY[callerRole.role] || 0) < ROLE_HIERARCHY.admin) {
    return res.status(403).json({ error: 'Only admins and owners can change roles' });
  }

  const targetMember = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), parseInt(userId));

  if (!targetMember) return res.status(404).json({ error: 'Member not found' });
  if (targetMember.role === 'owner') {
    return res.status(400).json({ error: 'Cannot change the role of an owner' });
  }

  if ((ROLE_HIERARCHY[targetMember.role] || 0) >= (ROLE_HIERARCHY[callerRole.role] || 0)) {
    return res.status(400).json({ error: 'Cannot change the role of a member with equal or higher role' });
  }

  if (role === 'owner') {
    return res.status(400).json({ error: 'Use the transfer-ownership endpoint to transfer ownership' });
  }

  if ((ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[callerRole.role] || 0)) {
    return res.status(400).json({ error: 'Cannot assign a role equal to or higher than your own' });
  }

  db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').run(
    role, parseInt(id), parseInt(userId)
  );

  db.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').run(
    req.user.id, parseInt(id), 'change_role', `Changed member ${userId} role to "${role}"`
  );

  res.json({ ok: true, message: `Role changed to "${role}"` });
});

router.delete('/:id/members/:userId', (req, res) => {
  const { id, userId } = req.params;

  const callerRole = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), req.user.id);

  if (!callerRole) return res.status(403).json({ error: 'Not a member' });
  if ((ROLE_HIERARCHY[callerRole.role] || 0) < ROLE_HIERARCHY.admin) {
    return res.status(403).json({ error: 'Only admins and owners can remove members' });
  }

  const targetMember = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), parseInt(userId));

  if (!targetMember) return res.status(404).json({ error: 'Member not found' });
  if (targetMember.role === 'owner') {
    return res.status(400).json({ error: 'Cannot remove an owner. Transfer ownership first.' });
  }

  if ((ROLE_HIERARCHY[targetMember.role] || 0) >= (ROLE_HIERARCHY[callerRole.role] || 0)) {
    return res.status(400).json({ error: 'Cannot remove a member with equal or higher role' });
  }

  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(parseInt(id), parseInt(userId));
  db.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').run(
    req.user.id, parseInt(id), 'remove_member', `Removed member ${userId} from workspace`
  );

  res.json({ ok: true, message: 'Member removed' });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const callerRole = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), req.user.id);

  if (!callerRole || callerRole.role !== 'owner') {
    return res.status(403).json({ error: 'Only the workspace owner can delete the workspace' });
  }

  db.prepare('DELETE FROM activity_log WHERE workspace_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM records WHERE workspace_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(parseInt(id));

  res.json({ ok: true, message: 'Workspace deleted' });
});

router.post('/:id/transfer-ownership', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const callerRole = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), req.user.id);

  if (!callerRole || callerRole.role !== 'owner') {
    return res.status(403).json({ error: 'Only the current owner can transfer ownership' });
  }

  const targetMember = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(parseInt(id), parseInt(userId));

  if (!targetMember) return res.status(404).json({ error: 'Target user is not a member' });

  const txn = db.transaction(() => {
    db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').run('admin', parseInt(id), req.user.id);
    db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').run('owner', parseInt(id), parseInt(userId));
  });
  txn();

  db.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').run(
    req.user.id, parseInt(id), 'transfer_ownership', `Transferred workspace ownership to user ${userId}`
  );

  res.json({ ok: true, message: 'Ownership transferred' });
});

export default router;
