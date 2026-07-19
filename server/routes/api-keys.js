import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../errors.js';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler((req, res) => {
  const keys = db.prepare(
    'SELECT id, name, workspace_id, created_at, expires_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(keys);
}));

router.post('/', asyncHandler((req, res) => {
  const { name = '', workspace_id = null, expires_at = null } = req.body;
  const key = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(
    'INSERT INTO api_keys (user_id, key, name, workspace_id, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, key, name, workspace_id, expires_at);

  const created = db.prepare(
    'SELECT id, name, key, workspace_id, created_at, expires_at FROM api_keys WHERE id = ?'
  ).get(result.lastInsertRowid);

  res.status(201).json(created);
}));

router.delete('/:id', asyncHandler((req, res) => {
  const { id } = req.params;
  const keyRow = db.prepare('SELECT id FROM api_keys WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!keyRow) throw new AppError('API key not found', 404, 'NOT_FOUND');

  db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  res.json({ ok: true, message: 'API key revoked' });
}));

export default router;
