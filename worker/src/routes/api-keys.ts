import type { Env } from '../auth';
import { authenticateRequest, json, error, generateApiKey } from '../auth';

export async function handleApiKeys(request: Request, env: Env, path: string): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const method = request.method;

  // GET /api/api-keys/
  if (method === 'GET' && path === '') {
    const { results: keys } = await env.DB.prepare(
      'SELECT id, name, workspace_id, created_at, expires_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return json(keys);
  }

  // POST /api/api-keys/
  if (method === 'POST' && path === '') {
    const body = await request.json() as { name?: string; workspace_id?: number; expires_at?: string };
    const key = generateApiKey();

    const result = await env.DB.prepare(
      'INSERT INTO api_keys (user_id, key, name, workspace_id, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, key, body.name || '', body.workspace_id || null, body.expires_at || null).run();

    const created = await env.DB.prepare(
      'SELECT id, name, key, workspace_id, created_at, expires_at FROM api_keys WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return json(created, 201);
  }

  // Routes with :id parameter
  const idMatch = path.match(/^(\d+)$/);
  if (idMatch && method === 'DELETE') {
    const keyId = parseInt(idMatch[1]);
    const keyRow = await env.DB.prepare('SELECT id FROM api_keys WHERE id = ? AND user_id = ?').bind(keyId, user.id).first();
    if (!keyRow) return error('API key not found', 404, 'NOT_FOUND');

    await env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(keyId).run();
    return json({ ok: true, message: 'API key revoked' });
  }

  return error('Not found', 404, 'NOT_FOUND');
}
