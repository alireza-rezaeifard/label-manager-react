import type { Env } from '../auth';
import { authenticateRequest, json, error } from '../auth';

export async function handleWebhooks(request: Request, env: Env, path: string): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const method = request.method;
  const url = new URL(request.url);

  // GET /api/webhooks/
  if (method === 'GET' && path === '') {
    const wsId = url.searchParams.get('workspace_id');
    if (!wsId) return error('workspace_id is required', 400, 'MISSING_WORKSPACE_ID');

    const { results: webhooks } = await env.DB.prepare(
      'SELECT id, workspace_id, url, events, secret, active, created_at FROM webhooks WHERE workspace_id = ? ORDER BY created_at DESC'
    ).bind(parseInt(wsId)).all();

    return json(webhooks.map((w: Record<string, unknown>) => ({
      ...w, secret: w.secret ? '***' : '',
    })));
  }

  // POST /api/webhooks/
  if (method === 'POST' && path === '') {
    const body = await request.json() as { workspace_id: number; url: string; events?: string | string[]; secret?: string };
    if (!body.workspace_id) return error('workspace_id is required', 400, 'MISSING_WORKSPACE_ID');
    if (!body.url || !body.url.trim()) return error('url is required', 400, 'MISSING_URL');

    const eventsJson = body.events || '["record:created","record:updated","record:deleted"]';
    const result = await env.DB.prepare(
      'INSERT INTO webhooks (workspace_id, url, events, secret) VALUES (?, ?, ?, ?)'
    ).bind(body.workspace_id, body.url.trim(), typeof eventsJson === 'string' ? eventsJson : JSON.stringify(eventsJson), body.secret || '').run();

    const webhook = await env.DB.prepare('SELECT id, workspace_id, url, events, active, created_at FROM webhooks WHERE id = ?').bind(result.meta.last_row_id).first();
    return json(webhook, 201);
  }

  // Routes with :id
  const idMatch = path.match(/^(\d+)(\/.*)?$/);
  if (idMatch) {
    const webhookId = parseInt(idMatch[1]);
    const subPath = (idMatch[2] || '').replace(/^\//, '');

    if (method === 'DELETE' && subPath === '') {
      const webhook = await env.DB.prepare('SELECT id FROM webhooks WHERE id = ?').bind(webhookId).first();
      if (!webhook) return error('Webhook not found', 404, 'NOT_FOUND');
      await env.DB.prepare('DELETE FROM webhooks WHERE id = ?').bind(webhookId).run();
      return json({ ok: true });
    }

    if (method === 'POST' && subPath === 'test') {
      const webhook = await env.DB.prepare('SELECT id, url, secret FROM webhooks WHERE id = ?').bind(webhookId).first<{ id: number; url: string; secret: string }>();
      if (!webhook) return error('Webhook not found', 404, 'NOT_FOUND');

      const payload = JSON.stringify({
        event: 'webhook:test',
        data: { message: 'This is a test webhook delivery' },
        timestamp: new Date().toISOString(),
      });

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhook.secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const sigHex = Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
        headers['X-Webhook-Signature'] = `sha256=${sigHex}`;
      }

      let success = false;
      let webhookError: string | null = null;
      try {
        const response = await fetch(webhook.url, { method: 'POST', headers, body: payload });
        success = response.ok;
      } catch (e) {
        webhookError = (e as Error).message;
      }

      return json({ ok: success, error: webhookError });
    }
  }

  return error('Not found', 404, 'NOT_FOUND');
}
