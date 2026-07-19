import db from '../db.js';

function sendEmail(to, subject, body) {
  console.log(`[Notification Email] To: ${to} | Subject: ${subject} | Body: ${body}`);
}

export function notifyWorkspace(workspaceId, event, record, excludeUserId) {
  const eventFlagMap = {
    'record:created': 'on_create',
    'record:updated': 'on_update',
    'record:deleted': 'on_delete',
  };

  const flag = eventFlagMap[event];
  if (!flag) return;

  const prefs = db.prepare(`
    SELECT np.email, u.username
    FROM notification_preferences np
    JOIN workspace_members wm ON wm.user_id = np.user_id
    JOIN users u ON u.id = np.user_id
    WHERE wm.workspace_id = ? AND np.user_id != ? AND np.${flag} = 1 AND np.email != ''
  `).all(workspaceId, excludeUserId);

  const eventLabels = { 'record:created': 'created', 'record:updated': 'updated', 'record:deleted': 'deleted' };
  const label = eventLabels[event] || event;

  for (const pref of prefs) {
    sendEmail(
      pref.email,
      `Record ${label} in workspace`,
      `Record "${record.code}" was ${label} by a workspace member.`
    );
  }
}
