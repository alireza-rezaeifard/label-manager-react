import type { Env } from '../auth';

export async function notifyWorkspace(
  env: Env, workspaceId: number, event: string, record: { code: string }, excludeUserId: number
): Promise<void> {
  const eventFlagMap: Record<string, string> = {
    'record:created': 'on_create',
    'record:updated': 'on_update',
    'record:deleted': 'on_delete',
  };

  const flag = eventFlagMap[event];
  if (!flag) return;

  const { results } = await env.DB.prepare(`
    SELECT np.email, u.username
    FROM notification_preferences np
    JOIN workspace_members wm ON wm.user_id = np.user_id
    JOIN users u ON u.id = np.user_id
    WHERE wm.workspace_id = ? AND np.user_id != ? AND np.${flag} = 1 AND np.email != ''
  `).bind(workspaceId, excludeUserId).all<{ email: string; username: string }>();

  const eventLabels: Record<string, string> = {
    'record:created': 'created',
    'record:updated': 'updated',
    'record:deleted': 'deleted',
  };
  const label = eventLabels[event] || event;

  for (const pref of results) {
    console.log(`[Notification] To: ${pref.email} | Record "${record.code}" was ${label}`);
  }
}
