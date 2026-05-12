import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const parsed = records.map(r => ({
    ...r,
    related: JSON.parse(r.related || '[]'),
  }));
  res.json(parsed);
});

router.post('/', (req, res) => {
  const { code, project, type, date, party, amount, related, image, color } = req.body;
  if (!code || !project) {
    return res.status(400).json({ error: 'Code and project are required' });
  }

  const result = db.prepare(
    'INSERT INTO records (code, project, type, date, party, amount, related, image, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(code, project, type || '', date || '', party || '', amount || '', JSON.stringify(related || []), image || '', color || '', req.user.id);

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
  record.related = JSON.parse(record.related || '[]');
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { code, project, type, date, party, amount, related, image, color } = req.body;

  const existing = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });

  db.prepare(
    'UPDATE records SET code=?, project=?, type=?, date=?, party=?, amount=?, related=?, image=?, color=?, updated_at=datetime(\'now\') WHERE id=? AND user_id=?'
  ).run(
    code || existing.code,
    project || existing.project,
    type ?? existing.type,
    date ?? existing.date,
    party ?? existing.party,
    amount ?? existing.amount,
    JSON.stringify(related || JSON.parse(existing.related || '[]')),
    image ?? existing.image,
    color ?? existing.color,
    id,
    req.user.id
  );

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  record.related = JSON.parse(record.related || '[]');
  res.json(record);
});

router.delete('/batch', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(
    `DELETE FROM records WHERE id IN (${placeholders}) AND user_id = ?`
  ).run(...ids, req.user.id);

  res.json({ deleted: result.changes });
});

router.post('/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array required' });
  }

  const txn = db.transaction(() => {
    ids.forEach((id, index) => {
      db.prepare('UPDATE records SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(id, req.user.id);
    });
  });
  txn();

  res.json({ ok: true });
});

router.get('/backup', (req, res) => {
  const records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
  const parsed = records.map(r => ({
    ...r,
    related: JSON.parse(r.related || '[]'),
  }));
  res.json(parsed);
});

router.post('/restore', (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records array required' });
  }

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM records WHERE user_id = ?').run(req.user.id);
    const insert = db.prepare(
      'INSERT INTO records (code, project, type, date, party, amount, related, image, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const r of records) {
      insert.run(r.code, r.project, r.type || '', r.date || '', r.party || '', r.amount || '', JSON.stringify(r.related || []), r.image || '', r.color || '', req.user.id);
    }
  });
  txn();

  res.json({ ok: true, count: records.length });
});

export default router;
