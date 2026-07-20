import type { Env } from '../auth';
import { authenticateRequest, json } from '../auth';

export async function handleNotifications(request: Request, env: Env, path: string): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const method = request.method;

  // GET /api/notifications/preferences
  if (method === 'GET' && path === 'preferences') {
    let prefs = await env.DB.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').bind(user.id).first();
    if (!prefs) {
      await env.DB.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').bind(user.id).run();
      prefs = await env.DB.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').bind(user.id).first();
    }
    return json(prefs);
  }

  // PUT /api/notifications/preferences
  if (method === 'PUT' && path === 'preferences') {
    const body = await request.json() as { email?: string; on_create?: number; on_update?: number; on_delete?: number };

    await env.DB.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').bind(user.id).run();

    await env.DB.prepare(`
      UPDATE notification_preferences SET
        email = COALESCE(?, email),
        on_create = COALESCE(?, on_create),
        on_update = COALESCE(?, on_update),
        on_delete = COALESCE(?, on_delete)
      WHERE user_id = ?
    `).bind(body.email ?? null, body.on_create ?? null, body.on_update ?? null, body.on_delete ?? null, user.id).run();

    const prefs = await env.DB.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').bind(user.id).first();
    return json(prefs);
  }

  return json({ error: 'Not found' }, 404);
}
