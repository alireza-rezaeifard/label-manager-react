import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

function logActivity(userId, action, details = '', recordId = null, workspaceId = null) {
  db.prepare(
    'INSERT INTO activity_log (user_id, workspace_id, action, details, record_id) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, workspaceId, action, details, recordId);
}

function parseRecord(r) {
  return {
    ...r,
    related: JSON.parse(r.related || '[]'),
    tags: JSON.parse(r.tags || '[]'),
  };
}

router.get('/', (req, res) => {
  const {
    page = 1,
    limit = 50,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
    type: filterType = '',
    party: filterParty = '',
    workspace_id: filterWorkspace = '',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const allowedSortFields = ['code', 'project', 'type', 'date', 'party', 'amount', 'created_at', 'updated_at', 'sort_order'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  let where;
  const params = [];

  if (filterWorkspace) {
    const wsId = parseInt(filterWorkspace, 10);
    const memberIds = db.prepare(
      'SELECT user_id FROM workspace_members WHERE workspace_id = ?'
    ).all(wsId).map(m => m.user_id);

    const isMember = memberIds.includes(req.user.id);
    if (!isMember) {
      const emptyResult = memberIds.length === 0;
    }

    if (memberIds.length > 0) {
      where = `WHERE workspace_id = ? AND user_id IN (${memberIds.map(() => '?').join(',')})`;
      params.push(wsId, ...memberIds);
    } else {
      where = 'WHERE 1=0';
    }
  } else {
    where = 'WHERE user_id = ?';
    params.push(req.user.id);
  }

  if (search) {
    where += ' AND (code LIKE ? OR project LIKE ? OR type LIKE ? OR party LIKE ? OR amount LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }

  if (filterType) {
    where += ' AND type = ?';
    params.push(filterType);
  }

  if (filterParty) {
    where += ' AND party = ?';
    params.push(filterParty);
  }

  const countResult = db.prepare(`SELECT COUNT(*) as total FROM records ${where}`).get(...params);
  const total = countResult.total;

  const records = db.prepare(
    `SELECT * FROM records ${where} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    records: records.map(parseRecord),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.post('/', (req, res) => {
  const { code, project, type, date, party, amount, related, tags, image, color, workspace_id } = req.body;
  if (!code || !project) {
    return res.status(400).json({ error: 'Code and project are required' });
  }

  const wsId = workspace_id || 1;

  const membership = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(wsId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as mx FROM records WHERE workspace_id = ?').get(wsId);
  const sortOrder = maxOrder.mx + 1;

  const result = db.prepare(
    `INSERT INTO records (code, project, type, date, party, amount, related, tags, image, color, sort_order, workspace_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    code, project, type || '', date || '', party || '', amount || '',
    JSON.stringify(related || []), JSON.stringify(tags || []),
    image || '', color || '', sortOrder, wsId, req.user.id
  );

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
  logActivity(req.user.id, 'create', `Created record ${code}`, record.id, wsId);
  res.status(201).json(parseRecord(record));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { code, project, type, date, party, amount, related, tags, image, color } = req.body;

  const existing = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });

  db.prepare(
    `UPDATE records SET
      code=?, project=?, type=?, date=?, party=?, amount=?,
      related=?, tags=?, image=?, color=?, updated_at=datetime('now')
     WHERE id=? AND user_id=?`
  ).run(
    code ?? existing.code,
    project ?? existing.project,
    type ?? existing.type,
    date ?? existing.date,
    party ?? existing.party,
    amount ?? existing.amount,
    JSON.stringify(related ?? JSON.parse(existing.related || '[]')),
    JSON.stringify(tags ?? JSON.parse(existing.tags || '[]')),
    image ?? existing.image,
    color ?? existing.color,
    id,
    req.user.id
  );

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  logActivity(req.user.id, 'update', `Updated record ${record.code}`, record.id);
  res.json(parseRecord(record));
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

  logActivity(req.user.id, 'delete', `Deleted ${result.changes} records`);
  res.json({ deleted: result.changes });
});

router.post('/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array required' });
  }

  const txn = db.transaction(() => {
    ids.forEach((id, index) => {
      db.prepare('UPDATE records SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
        .run(index, id, req.user.id);
    });
  });
  txn();

  logActivity(req.user.id, 'reorder', `Reordered ${ids.length} records`);
  res.json({ ok: true });
});

router.get('/backup', (req, res) => {
  const { workspace_id } = req.query;
  let records;
  if (workspace_id) {
    records = db.prepare('SELECT * FROM records WHERE workspace_id = ? ORDER BY created_at ASC').all(workspace_id);
  } else {
    records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
  }
  res.json(records.map(parseRecord));
});

router.post('/restore', (req, res) => {
  const { records, workspace_id } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records array required' });
  }

  const wsId = workspace_id || 1;
  const membership = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(wsId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM records WHERE workspace_id = ?').run(wsId);
    const insert = db.prepare(
      `INSERT INTO records (code, project, type, date, party, amount, related, tags, image, color, sort_order, workspace_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of records) {
      insert.run(
        r.code, r.project, r.type || '', r.date || '', r.party || '', r.amount || '',
        JSON.stringify(r.related || []), JSON.stringify(r.tags || []),
        r.image || '', r.color || '', r.sort_order || 0, wsId, req.user.id
      );
    }
  });
  txn();

  logActivity(req.user.id, 'restore', `Restored ${records.length} records`, null, wsId);
  res.json({ ok: true, count: records.length });
});

router.get('/activity', (req, res) => {
  const { workspace_id } = req.query;
  let logs;
  if (workspace_id) {
    logs = db.prepare(
      'SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(workspace_id);
  } else {
    logs = db.prepare(
      'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.user.id);
  }
  res.json(logs);
});

export default router;
