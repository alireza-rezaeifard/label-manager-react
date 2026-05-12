import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

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
  ).run(workspace_id, targetUser.id, 'member');

  db.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').run(
    req.user.id, workspace_id, 'invite', `Invited "${username}" to workspace`
  );

  res.json({ ok: true, message: `"${username}" invited to workspace` });
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

export default router;
