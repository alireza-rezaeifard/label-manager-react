import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcastToWorkspace } from '../ws.js';
import { AppError, asyncHandler } from '../errors.js';

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

router.get('/', asyncHandler((req, res) => {
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
}));

router.get('/all', asyncHandler((req, res) => {
  const { workspace_id, page = 1, limit = 200 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 200));
  const offset = (pageNum - 1) * limitNum;

  let records;
  let total;
  if (workspace_id) {
    const wsId = parseInt(workspace_id, 10);
    total = db.prepare('SELECT COUNT(*) as c FROM records WHERE workspace_id = ?').get(wsId).c;
    records = db.prepare('SELECT * FROM records WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(wsId, limitNum, offset);
  } else {
    total = db.prepare('SELECT COUNT(*) as c FROM records WHERE user_id = ?').get(req.user.id).c;
    records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.user.id, limitNum, offset);
  }
  res.json({ records: records.map(parseRecord), total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
}));

router.get('/check-code', asyncHandler((req, res) => {
  const { code, excludeId } = req.query;
  if (!code) throw new AppError('Code is required', 400, 'MISSING_CODE');

  let existing;
  if (excludeId) {
    existing = db.prepare('SELECT id FROM records WHERE code = ? AND id != ? AND user_id = ?').get(code, excludeId, req.user.id);
  } else {
    existing = db.prepare('SELECT id FROM records WHERE code = ? AND user_id = ?').get(code, req.user.id);
  }

  res.json({ exists: !!existing, code });
}));

router.post('/', asyncHandler((req, res) => {
  const { code, project, type, date, party, amount, related, tags, image, color, workspace_id } = req.body;
  if (!code || !code.trim()) throw new AppError('Code is required', 400, 'MISSING_CODE');
  if (!project || !project.trim()) throw new AppError('Project is required', 400, 'MISSING_PROJECT');

  const wsId = workspace_id || 1;

  const duplicate = db.prepare('SELECT id FROM records WHERE code = ? AND workspace_id = ?').get(code, wsId);
  if (duplicate) throw new AppError(`Code "${code}" already exists in this workspace`, 409, 'DUPLICATE_CODE');

  const membership = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(wsId, req.user.id);

  if (!membership) throw new AppError('Not a member of this workspace', 403, 'FORBIDDEN');

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
  broadcastToWorkspace(wsId, 'record:created', parseRecord(record));
  res.status(201).json(parseRecord(record));
}));

router.put('/:id', asyncHandler((req, res) => {
  const { id } = req.params;
  const { code, project, type, date, party, amount, related, tags, image, color } = req.body;

  const existing = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) throw new AppError('Record not found', 404, 'NOT_FOUND');

  if (code && code !== existing.code) {
    const dup = db.prepare('SELECT id FROM records WHERE code = ? AND id != ? AND user_id = ?').get(code, id, req.user.id);
    if (dup) throw new AppError(`Code "${code}" already exists`, 409, 'DUPLICATE_CODE');
  }

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
  broadcastToWorkspace(record.workspace_id, 'record:updated', parseRecord(record));
  res.json(parseRecord(record));
}));

router.delete('/batch', asyncHandler((req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array required', 400, 'MISSING_IDS');
  }

  const records = db.prepare(`SELECT * FROM records WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(
    `DELETE FROM records WHERE id IN (${placeholders}) AND user_id = ?`
  ).run(...ids, req.user.id);

  logActivity(req.user.id, 'delete', `Deleted ${result.changes} records`);
  for (const r of records) {
    broadcastToWorkspace(r.workspace_id, 'record:deleted', { id: r.id, code: r.code });
  }
  res.json({ deleted: result.changes });
}));

router.post('/reorder', asyncHandler((req, res) => {
  const { ids, workspace_id } = req.body;
  if (!Array.isArray(ids)) {
    throw new AppError('ids array required', 400, 'MISSING_IDS');
  }

  const txn = db.transaction(() => {
    ids.forEach((recordId, index) => {
      db.prepare('UPDATE records SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
        .run(index, recordId, req.user.id);
    });
  });
  txn();

  logActivity(req.user.id, 'reorder', `Reordered ${ids.length} records`);
  if (workspace_id) broadcastToWorkspace(workspace_id, 'records:reordered', { ids });
  res.json({ ok: true });
}));

router.get('/backup', asyncHandler((req, res) => {
  const { workspace_id } = req.query;
  let records;
  if (workspace_id) {
    records = db.prepare('SELECT * FROM records WHERE workspace_id = ? ORDER BY created_at ASC').all(workspace_id);
  } else {
    records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
  }
  res.json(records.map(parseRecord));
}));

router.post('/restore', asyncHandler((req, res) => {
  const { records, workspace_id } = req.body;
  if (!Array.isArray(records)) throw new AppError('records array required', 400, 'MISSING_RECORDS');

  const wsId = workspace_id || 1;
  db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(wsId, req.user.id, 'member');

  const membership = db.prepare(
    'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(wsId, req.user.id);

  if (!membership) throw new AppError('Not a member of this workspace', 403, 'FORBIDDEN');

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
  broadcastToWorkspace(wsId, 'records:restored', { workspace_id: wsId });
  res.json({ ok: true, count: records.length });
}));

router.get('/activity', asyncHandler((req, res) => {
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
}));

export default router;
