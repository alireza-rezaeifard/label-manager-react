import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireWorkspaceRole } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../errors.js';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req, res) => {
  const { workspace_id } = req.query;
  let fields;
  if (workspace_id) {
    fields = db.prepare('SELECT * FROM custom_fields WHERE workspace_id = ? ORDER BY sort_order ASC').all(workspace_id);
  } else {
    fields = db.prepare('SELECT * FROM custom_fields ORDER BY sort_order ASC').all();
  }
  res.json(fields.map(f => ({
    key: f.key,
    label: f.label,
    fa: f.fa,
    placeholder: f.placeholder,
    fieldType: f.field_type,
    options: JSON.parse(f.options || '[]'),
    isCustom: true,
  })));
}));

router.post('/', asyncHandler((req, res) => {
  const { key, label, fa, placeholder, fieldType, options, workspace_id } = req.body;
  if (!key || !key.trim()) throw new AppError('Key is required', 400, 'MISSING_KEY');
  if (!label || !label.trim()) throw new AppError('Label is required', 400, 'MISSING_LABEL');

  const wsId = workspace_id || 1;

  const existing = db.prepare('SELECT id FROM custom_fields WHERE workspace_id = ? AND key = ?').get(wsId, key);
  if (existing) throw new AppError(`Field "${key}" already exists`, 409, 'DUPLICATE_KEY');

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as mx FROM custom_fields WHERE workspace_id = ?').get(wsId);
  const sortOrder = maxOrder.mx + 1;

  db.prepare(
    `INSERT INTO custom_fields (workspace_id, key, label, fa, placeholder, field_type, options, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(wsId, key, label, fa || '', placeholder || '', fieldType || 'text', JSON.stringify(options || []), sortOrder);

  res.status(201).json({ key, label, fa, placeholder, fieldType, options, isCustom: true });
}));

router.post('/batch', asyncHandler((req, res) => {
  const { fields, workspace_id } = req.body;
  if (!Array.isArray(fields)) throw new AppError('fields array required', 400, 'MISSING_FIELDS');

  const wsId = workspace_id || 1;

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM custom_fields WHERE workspace_id = ?').run(wsId);
    const insert = db.prepare(
      `INSERT INTO custom_fields (workspace_id, key, label, fa, placeholder, field_type, options, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    fields.forEach((f, i) => {
      insert.run(wsId, f.key, f.label, f.fa || '', f.placeholder || '', f.fieldType || 'text', JSON.stringify(f.options || []), i);
    });
  });
  txn();

  res.json({ ok: true, count: fields.length });
}));

router.put('/:key', asyncHandler((req, res) => {
  const { key } = req.params;
  const { label, fa, placeholder, fieldType, options, workspace_id } = req.body;
  const wsId = workspace_id || 1;

  const existing = db.prepare('SELECT id FROM custom_fields WHERE workspace_id = ? AND key = ?').get(wsId, key);
  if (!existing) throw new AppError('Field not found', 404, 'NOT_FOUND');

  db.prepare(
    `UPDATE custom_fields SET label = ?, fa = ?, placeholder = ?, field_type = ?, options = ?
     WHERE workspace_id = ? AND key = ?`
  ).run(label || '', fa || '', placeholder || '', fieldType || 'text', JSON.stringify(options || []), wsId, key);

  res.json({ key, label, fa, placeholder, fieldType, options, isCustom: true });
}));

router.delete('/:key', asyncHandler((req, res) => {
  const { key } = req.params;
  const { workspace_id } = req.query;
  const wsId = workspace_id || 1;

  const result = db.prepare('DELETE FROM custom_fields WHERE workspace_id = ? AND key = ?').run(wsId, key);
  if (result.changes === 0) throw new AppError('Field not found', 404, 'NOT_FOUND');

  res.json({ ok: true });
}));

export default router;
