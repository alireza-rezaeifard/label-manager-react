import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../errors.js';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler((req, res) => {
  const { workspace_id } = req.query;
  if (!workspace_id) throw new AppError('workspace_id is required', 400, 'MISSING_WORKSPACE_ID');

  const webhooks = db.prepare(
    'SELECT id, workspace_id, url, events, secret, active, created_at FROM webhooks WHERE workspace_id = ? ORDER BY created_at DESC'
  ).all(workspace_id);

  res.json(webhooks.map(w => ({ ...w, secret: w.secret ? '***' : '' })));
}));

router.post('/', asyncHandler((req, res) => {
  const { workspace_id, url, events, secret } = req.body;
  if (!workspace_id) throw new AppError('workspace_id is required', 400, 'MISSING_WORKSPACE_ID');
  if (!url || !url.trim()) throw new AppError('url is required', 400, 'MISSING_URL');

  const eventsJson = events || '["record:created","record:updated","record:deleted"]';
  const result = db.prepare(
    'INSERT INTO webhooks (workspace_id, url, events, secret) VALUES (?, ?, ?, ?)'
  ).run(workspace_id, url.trim(), typeof eventsJson === 'string' ? eventsJson : JSON.stringify(eventsJson), secret || '');

  const webhook = db.prepare('SELECT id, workspace_id, url, events, active, created_at FROM webhooks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(webhook);
}));

router.delete('/:id', asyncHandler((req, res) => {
  const { id } = req.params;
  const webhook = db.prepare('SELECT id, workspace_id FROM webhooks WHERE id = ?').get(id);
  if (!webhook) throw new AppError('Webhook not found', 404, 'NOT_FOUND');

  db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
  res.json({ ok: true });
}));

router.post('/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const webhook = db.prepare('SELECT id, url, secret FROM webhooks WHERE id = ?').get(id);
  if (!webhook) throw new AppError('Webhook not found', 404, 'NOT_FOUND');

  const payload = JSON.stringify({
    event: 'webhook:test',
    data: { message: 'This is a test webhook delivery' },
    timestamp: new Date().toISOString(),
  });

  const headers = { 'Content-Type': 'application/json' };
  if (webhook.secret) {
    const signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  let success = false;
  let error = null;
  try {
    const response = await fetch(webhook.url, { method: 'POST', headers, body: payload });
    success = response.ok;
  } catch (e) {
    error = e.message;
  }

  res.json({ ok: success, error });
}));

export default router;
