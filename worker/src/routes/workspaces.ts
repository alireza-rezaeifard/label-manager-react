import type { Env } from '../auth';
import { authenticateRequest, json, error, roleLevel } from '../auth';

const ROLE_HIERARCHY: Record<string, number> = { owner: 10, admin: 8, editor: 5, viewer: 1 };
const VALID_ROLES = ['owner', 'admin', 'editor', 'viewer'];

export async function handleWorkspaces(request: Request, env: Env, path: string): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const method = request.method;

  // GET /api/workspaces/
  if (method === 'GET' && path === '') {
    const { results: workspaces } = await env.DB.prepare(`
      SELECT w.*, wm.role as member_role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
      ORDER BY w.created_at ASC
    `).bind(user.id).all();
    return json(workspaces);
  }

  // POST /api/workspaces/
  if (method === 'POST' && path === '') {
    const body = await request.json() as { name: string; description?: string };
    if (!body.name || !body.name.trim()) return error('Workspace name is required', 400, 'MISSING_NAME');

    const result = await env.DB.prepare('INSERT INTO workspaces (name, description, created_by) VALUES (?, ?, ?)').bind(
      body.name.trim(), body.description || '', user.id
    ).run();

    const wsId = result.meta.last_row_id as number;

    await env.DB.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(wsId, user.id, 'owner').run();

    const workspace = await env.DB.prepare('SELECT * FROM workspaces WHERE id = ?').bind(wsId).first();
    await env.DB.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)').bind(
      user.id, 'create_workspace', `Created workspace "${body.name}"`
    ).run();

    return json({ ...workspace, member_role: 'owner', member_count: 1 }, 201);
  }

  // POST /api/workspaces/invite
  if (method === 'POST' && path === 'invite') {
    const body = await request.json() as { workspace_id: number; username: string };
    if (!body.workspace_id || !body.username) return error('Workspace ID and username are required', 400, 'MISSING_FIELDS');

    const membership = await env.DB.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).bind(body.workspace_id, user.id).first<{ role: string }>();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return error('Only workspace owners and admins can invite', 403, 'FORBIDDEN');
    }

    const targetUser = await env.DB.prepare('SELECT id, username FROM users WHERE username = ?').bind(body.username).first<{ id: number; username: string }>();
    if (!targetUser) return error('User not found', 404, 'USER_NOT_FOUND');

    const alreadyMember = await env.DB.prepare(
      'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).bind(body.workspace_id, targetUser.id).first();
    if (alreadyMember) return error('User is already a member', 409, 'ALREADY_MEMBER');

    await env.DB.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(
      body.workspace_id, targetUser.id, 'editor'
    ).run();

    await env.DB.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').bind(
      user.id, body.workspace_id, 'invite', `Invited "${body.username}" to workspace as editor`
    ).run();

    return json({ ok: true, message: `"${body.username}" invited to workspace as editor` });
  }

  // Routes with :id parameter
  const idMatch = path.match(/^(\d+)(\/.*)?$/);
  if (idMatch) {
    const wsId = parseInt(idMatch[1]);
    const subPath = (idMatch[2] || '').replace(/^\//, '');

    // GET /api/workspaces/:id/members
    if (method === 'GET' && subPath === 'members') {
      const membership = await env.DB.prepare(
        'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, user.id).first();
      if (!membership) return error('Not a member of this workspace', 403, 'FORBIDDEN');

      const { results: members } = await env.DB.prepare(`
        SELECT u.id, u.username, u.role as user_role, wm.role as member_role, wm.joined_at
        FROM workspace_members wm JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = ? ORDER BY wm.joined_at ASC
      `).bind(wsId).all();
      return json(members);
    }

    // DELETE /api/workspaces/:id/leave
    if (method === 'DELETE' && subPath === 'leave') {
      const membership = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, user.id).first<{ role: string }>();

      if (!membership) return error('Not a member', 404, 'NOT_MEMBER');

      if (membership.role === 'owner') {
        const ownerCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND role = ?'
        ).bind(wsId, 'owner').first<{ count: number }>();
        if (ownerCount && ownerCount.count <= 1) {
          return error('Cannot leave: you are the only owner. Transfer ownership first.', 400, 'LAST_OWNER');
        }
      }

      await env.DB.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').bind(wsId, user.id).run();
      return json({ ok: true });
    }

    // DELETE /api/workspaces/:id/members/:userId
    const memberDeleteMatch = subPath.match(/^members\/(\d+)$/);
    if (method === 'DELETE' && memberDeleteMatch) {
      const targetUserId = parseInt(memberDeleteMatch[1]);

      const callerRole = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, user.id).first<{ role: string }>();
      if (!callerRole) return error('Not a member', 403, 'FORBIDDEN');
      if (roleLevel(callerRole.role) < roleLevel('admin')) return error('Only admins and owners can remove members', 403, 'FORBIDDEN');

      const targetMember = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, targetUserId).first<{ role: string }>();
      if (!targetMember) return error('Member not found', 404, 'NOT_FOUND');
      if (targetMember.role === 'owner') return error('Cannot remove an owner. Transfer ownership first.', 400, 'CANNOT_REMOVE_OWNER');
      if (roleLevel(targetMember.role) >= roleLevel(callerRole.role)) return error('Cannot remove a member with equal or higher role', 400, 'ROLE_CONFLICT');

      await env.DB.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').bind(wsId, targetUserId).run();
      await env.DB.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').bind(
        user.id, wsId, 'remove_member', `Removed member ${targetUserId} from workspace`
      ).run();

      return json({ ok: true, message: 'Member removed' });
    }

    // PUT /api/workspaces/:id/members/:userId/role
    const memberRoleMatch = subPath.match(/^members\/(\d+)\/role$/);
    if (method === 'PUT' && memberRoleMatch) {
      const targetUserId = parseInt(memberRoleMatch[1]);
      const body = await request.json() as { role: string };
      if (!VALID_ROLES.includes(body.role)) return error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400, 'INVALID_ROLE');

      const callerRole = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, user.id).first<{ role: string }>();
      if (!callerRole) return error('Not a member', 403, 'FORBIDDEN');
      if (roleLevel(callerRole.role) < roleLevel('admin')) return error('Only admins and owners can change roles', 403, 'FORBIDDEN');

      const targetMember = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, targetUserId).first<{ role: string }>();
      if (!targetMember) return error('Member not found', 404, 'NOT_FOUND');
      if (targetMember.role === 'owner') return error('Cannot change the role of an owner', 400, 'CANNOT_CHANGE_OWNER');
      if (roleLevel(targetMember.role) >= roleLevel(callerRole.role)) return error('Cannot change the role of a member with equal or higher role', 400, 'ROLE_CONFLICT');
      if (body.role === 'owner') return error('Use the transfer-ownership endpoint to transfer ownership', 400, 'USE_TRANSFER');
      if (roleLevel(body.role) >= roleLevel(callerRole.role)) return error('Cannot assign a role equal to or higher than your own', 400, 'ROLE_CONFLICT');

      await env.DB.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').bind(body.role, wsId, targetUserId).run();
      await env.DB.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').bind(
        user.id, wsId, 'change_role', `Changed member ${targetUserId} role to "${body.role}"`
      ).run();

      return json({ ok: true, message: `Role changed to "${body.role}"` });
    }

    // DELETE /api/workspaces/:id
    if (method === 'DELETE' && subPath === '') {
      const callerRole = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, user.id).first<{ role: string }>();
      if (!callerRole || callerRole.role !== 'owner') return error('Only the workspace owner can delete the workspace', 403, 'FORBIDDEN');

      await env.DB.batch([
        env.DB.prepare('DELETE FROM activity_log WHERE workspace_id = ?').bind(wsId),
        env.DB.prepare('DELETE FROM records WHERE workspace_id = ?').bind(wsId),
        env.DB.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').bind(wsId),
        env.DB.prepare('DELETE FROM workspaces WHERE id = ?').bind(wsId),
      ]);

      return json({ ok: true, message: 'Workspace deleted' });
    }

    // POST /api/workspaces/:id/transfer-ownership
    if (method === 'POST' && subPath === 'transfer-ownership') {
      const body = await request.json() as { userId: number };
      if (!body.userId) return error('userId is required', 400, 'MISSING_USER_ID');

      const callerRole = await env.DB.prepare(
        'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, user.id).first<{ role: string }>();
      if (!callerRole || callerRole.role !== 'owner') return error('Only the current owner can transfer ownership', 403, 'FORBIDDEN');

      const targetMember = await env.DB.prepare(
        'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).bind(wsId, body.userId).first();
      if (!targetMember) return error('Target user is not a member', 404, 'NOT_FOUND');

      await env.DB.batch([
        env.DB.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').bind('admin', wsId, user.id),
        env.DB.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').bind('owner', wsId, body.userId),
      ]);

      await env.DB.prepare('INSERT INTO activity_log (user_id, workspace_id, action, details) VALUES (?, ?, ?, ?)').bind(
        user.id, wsId, 'transfer_ownership', `Transferred workspace ownership to user ${body.userId}`
      ).run();

      return json({ ok: true, message: 'Ownership transferred' });
    }
  }

  return error('Not found', 404, 'NOT_FOUND');
}
