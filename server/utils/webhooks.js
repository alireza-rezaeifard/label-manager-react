import crypto from 'crypto';
import db from '../db.js';

export async function triggerWebhooks(workspaceId, event, data) {
  try {
    const webhooks = db.prepare(
      "SELECT id, url, events, secret FROM webhooks WHERE workspace_id = ? AND active = 1"
    ).all(workspaceId);

    const matching = webhooks.filter(wh => {
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
      const headers = { 'Content-Type': 'application/json' };
      if (wh.secret) {
        const signature = crypto.createHmac('sha256', wh.secret).update(payload).digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      fetch(wh.url, { method: 'POST', headers, body: payload }).catch(() => {});
    }
  } catch {
    // webhook failures should not break the app
  }
}
