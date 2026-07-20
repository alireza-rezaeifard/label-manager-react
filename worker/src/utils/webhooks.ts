import type { Env } from '../auth';

export async function triggerWebhooks(env: Env, workspaceId: number, event: string, data: unknown): Promise<void> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, url, events, secret FROM webhooks WHERE workspace_id = ? AND active = 1"
    ).bind(workspaceId).all<{ id: number; url: string; events: string; secret: string }>();

    const matching = results.filter(wh => {
      try {
        const events = JSON.parse(wh.events);
        return events.includes(event);
      } catch {
        return false;
      }
    });

    if (matching.length === 0) return;

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

    for (const wh of matching) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (wh.secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw', encoder.encode(wh.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const sigHex = Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
        headers['X-Webhook-Signature'] = `sha256=${sigHex}`;
      }

      fetch(wh.url, { method: 'POST', headers, body: payload }).catch(() => {});
    }
  } catch {
    // webhook failures should not break the app
  }
}
