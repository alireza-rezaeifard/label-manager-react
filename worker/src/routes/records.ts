import type { Env, JWTPayload } from '../auth';
import { authenticateRequest, json, error, roleLevel } from '../auth';
import { sanitizeObject } from '../utils/sanitize';
import { triggerWebhooks } from '../utils/webhooks';
import { notifyWorkspace } from '../utils/notifications';

function parseRecord(r: Record<string, unknown>) {
  return {
    ...r,
    related: typeof r.related === 'string' ? JSON.parse(r.related as string || '[]') : r.related || [],
    tags: typeof r.tags === 'string' ? JSON.parse(r.tags as string || '[]') : r.tags || [],
  };
}

async function logActivity(env: Env, userId: number, action: string, details = '', recordId: number | null = null, workspaceId: number | null = null) {
  await env.DB.prepare(
    'INSERT INTO activity_log (user_id, workspace_id, action, details, record_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, workspaceId, action, details, recordId).run();
}

async function saveRecordVersion(env: Env, userId: number, record: Record<string, unknown>, workspaceId: number, summary: string) {
  const snapshot = { ...record };
  if (typeof snapshot.related === 'object') snapshot.related = JSON.stringify(snapshot.related);
  if (typeof snapshot.tags === 'object') snapshot.tags = JSON.stringify(snapshot.tags);
  const user = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first<{ username: string }>();
  await env.DB.prepare(
    `INSERT INTO record_versions (record_id, workspace_id, user_id, user_name, snapshot, change_summary) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(record.id, workspaceId, userId, user?.username || '', JSON.stringify(snapshot), summary).run();
}

async function getWorkspaceRole(env: Env, wsId: number, userId: number) {
  return env.DB.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).bind(wsId, userId).first<{ role: string }>();
}

export async function handleRecords(request: Request, env: Env, path: string): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const method = request.method;
  const url = new URL(request.url);

  // GET /api/records/
  if (method === 'GET' && path === '') {
    const limit = Math.min(10000, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const search = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const filterType = url.searchParams.get('type') || '';
    const filterParty = url.searchParams.get('party') || '';
    const filterWorkspace = url.searchParams.get('workspace_id') || '';
    const cursor = url.searchParams.get('cursor') || '';

    const allowedSortFields = ['code', 'project', 'type', 'date', 'party', 'amount', 'created_at', 'updated_at', 'sort_order'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filterWorkspace) {
      const wsId = parseInt(filterWorkspace, 10);
      const { results: members } = await env.DB.prepare(
        'SELECT user_id FROM workspace_members WHERE workspace_id = ?'
      ).bind(wsId).all<{ user_id: number }>();
      const memberIds = members.map(m => m.user_id);

      if (memberIds.length > 0) {
        conditions.push(`workspace_id = ? AND user_id IN (${memberIds.map(() => '?').join(',')}) AND deleted_at IS NULL`);
        params.push(wsId, ...memberIds);
      } else {
        conditions.push('1=0');
      }
    } else {
      conditions.push('user_id = ? AND deleted_at IS NULL');
      params.push(user.id);
    }

    if (search) {
      const ftsQ = search.replace(/['"]/g, '').trim();
      if (ftsQ) {
        conditions.push('records.id IN (SELECT rowid FROM records_fts WHERE records_fts MATCH ?)');
        params.push(ftsQ);
      }
    }

    if (filterType) {
      conditions.push('type = ?');
      params.push(filterType);
    }

    if (filterParty) {
      conditions.push('party = ?');
      params.push(filterParty);
    }

    if (cursor) {
      conditions.push('created_at < ?');
      params.push(cursor);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderClause: string;
    if (sortBy === 'created_at' && sortOrder === 'desc') {
      orderClause = 'sort_order ASC, created_at DESC';
    } else {
      orderClause = `${safeSortBy} ${safeSortOrder}`;
    }

    const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM records ${where}`).bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    const { results: records } = await env.DB.prepare(
      `SELECT * FROM records ${where} ORDER BY ${orderClause} LIMIT ?`
    ).bind(...params, limit).all();

    const nextCursor = records.length > 0 ? (records[records.length - 1] as Record<string, unknown>).created_at : null;

    return json({
      records: records.map(parseRecord),
      total,
      nextCursor,
      page: 1,
      limit,
    });
  }

  // GET /api/records/all
  if (method === 'GET' && path === 'all') {
    const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limitNum = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '200', 10)));
    const offset = (pageNum - 1) * limitNum;
    const wsId = url.searchParams.get('workspace_id');

    let total: number;
    let records: unknown[];

    if (wsId) {
      total = (await env.DB.prepare('SELECT COUNT(*) as c FROM records WHERE workspace_id = ? AND deleted_at IS NULL').bind(parseInt(wsId)).first<{ c: number }>())?.c || 0;
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(parseInt(wsId), limitNum, offset).all();
      records = results;
    } else {
      total = (await env.DB.prepare('SELECT COUNT(*) as c FROM records WHERE user_id = ? AND deleted_at IS NULL').bind(user.id).first<{ c: number }>())?.c || 0;
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(user.id, limitNum, offset).all();
      records = results;
    }

    return json({ records: records.map(parseRecord), total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  }

  // GET /api/records/check-code
  if (method === 'GET' && path === 'check-code') {
    const code = url.searchParams.get('code');
    const excludeId = url.searchParams.get('excludeId');
    if (!code) return error('Code is required', 400, 'MISSING_CODE');

    let existing;
    if (excludeId) {
      existing = await env.DB.prepare('SELECT id FROM records WHERE code = ? AND id != ? AND user_id = ? AND deleted_at IS NULL').bind(code, parseInt(excludeId), user.id).first();
    } else {
      existing = await env.DB.prepare('SELECT id FROM records WHERE code = ? AND user_id = ? AND deleted_at IS NULL').bind(code, user.id).first();
    }

    return json({ exists: !!existing, code });
  }

  // GET /api/records/trash
  if (method === 'GET' && path === 'trash') {
    const wsId = url.searchParams.get('workspace_id');
    let records;
    if (wsId) {
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE workspace_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC').bind(parseInt(wsId)).all();
      records = results;
    } else {
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC').bind(user.id).all();
      records = results;
    }
    return json(records.map(parseRecord));
  }

  // GET /api/records/backup
  if (method === 'GET' && path === 'backup') {
    const wsId = url.searchParams.get('workspace_id');
    let records;
    if (wsId) {
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY created_at ASC').bind(parseInt(wsId)).all();
      records = results;
    } else {
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at ASC').bind(user.id).all();
      records = results;
    }
    return json(records.map(parseRecord));
  }

  // GET /api/records/activity
  if (method === 'GET' && path === 'activity') {
    const wsId = url.searchParams.get('workspace_id');
    let logs;
    if (wsId) {
      const { results } = await env.DB.prepare('SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50').bind(parseInt(wsId)).all();
      logs = results;
    } else {
      const { results } = await env.DB.prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(user.id).all();
      logs = results;
    }
    return json(logs);
  }

  // POST /api/records/
  if (method === 'POST' && path === '') {
    const body = sanitizeObject(await request.json() as Record<string, unknown>);
    const { code, project, type, date, party, amount, related, tags, image, color, workspace_id } = body as Record<string, unknown>;
    if (!code || !(code as string).trim()) return error('Code is required', 400, 'MISSING_CODE');
    if (!project || !(project as string).trim()) return error('Project is required', 400, 'MISSING_PROJECT');

    const wsId = (workspace_id as number) || 1;

    const duplicate = await env.DB.prepare('SELECT id FROM records WHERE code = ? AND workspace_id = ?').bind(code, wsId).first();
    if (duplicate) return error(`Code "${code}" already exists in this workspace`, 409, 'DUPLICATE_CODE');

    const roleInfo = await getWorkspaceRole(env, wsId, user.id);
    if (!roleInfo) return error('Not a member of this workspace', 403, 'FORBIDDEN');
    if (roleLevel(roleInfo.role) < roleLevel('editor')) {
      return error('Editing records requires "editor" role or higher', 403, 'INSUFFICIENT_ROLE');
    }

    const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as mx FROM records WHERE workspace_id = ?').bind(wsId).first<{ mx: number }>();
    const sortOrder = (maxOrder?.mx || 0) + 1;

    const result = await env.DB.prepare(
      `INSERT INTO records (code, project, type, date, party, amount, related, tags, image, color, sort_order, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      code, project, type || '', date || '', party || '', amount || '',
      JSON.stringify(related || []), JSON.stringify(tags || []),
      image || '', color || '', sortOrder, wsId, user.id
    ).run();

    const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(result.meta.last_row_id).first();
    if (!record) return error('Failed to create record', 500, 'INTERNAL_ERROR');

    await saveRecordVersion(env, user.id, record, wsId, `Created record ${code}`);
    await logActivity(env, user.id, 'create', `Created record ${code}`, record.id as number, wsId);
    await triggerWebhooks(env, wsId, 'record:created', parseRecord(record));
    await notifyWorkspace(env, wsId, 'record:created', parseRecord(record) as { code: string }, user.id);

    return json(parseRecord(record), 201);
  }

  // POST /api/records/batch (DELETE)
  if (method === 'DELETE' && path === 'batch') {
    const body = await request.json() as { ids: number[] };
    if (!Array.isArray(body.ids) || body.ids.length === 0) return error('ids array required', 400, 'MISSING_IDS');

    const placeholders = body.ids.map(() => '?').join(',');
    const { results: records } = await env.DB.prepare(`SELECT * FROM records WHERE id IN (${placeholders})`).bind(...body.ids).all();

    const wsIds = [...new Set(records.map((r: Record<string, unknown>) => r.workspace_id as number))];
    for (const wsId of wsIds) {
      const roleInfo = await getWorkspaceRole(env, wsId, user.id);
      if (!roleInfo || roleLevel(roleInfo.role) < roleLevel('editor')) {
        return error('Insufficient permissions to delete records', 403, 'INSUFFICIENT_ROLE');
      }
    }

    const result = await env.DB.prepare(
      `UPDATE records SET deleted_at = datetime('now') WHERE id IN (${placeholders}) AND deleted_at IS NULL`
    ).bind(...body.ids).run();

    await logActivity(env, user.id, 'trash', `Moved ${result.meta.changes} records to trash`);
    for (const r of records) {
      const record = r as Record<string, unknown>;
      await triggerWebhooks(env, record.workspace_id as number, 'record:deleted', { id: record.id, code: record.code });
      await notifyWorkspace(env, record.workspace_id as number, 'record:deleted', { code: record.code as string }, user.id);
    }

    return json({ deleted: result.meta.changes });
  }

  // POST /api/records/trash/restore
  if (method === 'POST' && path === 'trash/restore') {
    const body = await request.json() as { ids: number[] };
    if (!Array.isArray(body.ids) || body.ids.length === 0) return error('ids array required', 400, 'MISSING_IDS');

    const placeholders = body.ids.map(() => '?').join(',');
    const result = await env.DB.prepare(
      `UPDATE records SET deleted_at = NULL WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`
    ).bind(...body.ids).run();

    await logActivity(env, user.id, 'restore', `Restored ${result.meta.changes} records from trash`);
    return json({ restored: result.meta.changes });
  }

  // DELETE /api/records/trash/permanent
  if (method === 'DELETE' && path === 'trash/permanent') {
    const body = await request.json() as { ids: number[] };
    if (!Array.isArray(body.ids) || body.ids.length === 0) return error('ids array required', 400, 'MISSING_IDS');

    const placeholders = body.ids.map(() => '?').join(',');
    const { results: records } = await env.DB.prepare(`SELECT * FROM records WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`).bind(...body.ids).all();

    const result = await env.DB.prepare(
      `DELETE FROM records WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`
    ).bind(...body.ids).run();

    await logActivity(env, user.id, 'permanent_delete', `Permanently deleted ${result.meta.changes} records`);
    for (const r of records) {
      const record = r as Record<string, unknown>;
      await triggerWebhooks(env, record.workspace_id as number, 'record:deleted', { id: record.id, code: record.code });
      await notifyWorkspace(env, record.workspace_id as number, 'record:deleted', { code: record.code as string }, user.id);
    }

    return json({ deleted: result.meta.changes });
  }

  // POST /api/records/import-url
  if (method === 'POST' && path === 'import-url') {
    const body = await request.json() as { url: string; workspace_id?: number };
    if (!body.url || typeof body.url !== 'string') return error('URL is required', 400, 'MISSING_URL');

    let parsedUrl: URL;
    try { parsedUrl = new URL(body.url); } catch { return error('Invalid URL format', 400, 'INVALID_URL'); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return error('Only http and https URLs are allowed', 400, 'INVALID_URL');

    const wsId = body.workspace_id || 1;
    const roleInfo = await getWorkspaceRole(env, wsId, user.id);
    if (!roleInfo) return error('Not a member of this workspace', 403, 'FORBIDDEN');
    if (roleLevel(roleInfo.role) < roleLevel('editor')) return error('Importing requires "editor" role or higher', 403, 'INSUFFICIENT_ROLE');

    let response: Response;
    try { response = await fetch(body.url, { signal: AbortSignal.timeout(30000) }); }
    catch { return error('Failed to fetch URL', 400, 'FETCH_FAILED'); }
    if (!response.ok) return error(`Remote server returned ${response.status}`, 400, 'REMOTE_ERROR');

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('sheet') || contentType.includes('excel') || body.url.match(/\.xlsx?$/i)) {
      return error('Excel import from URL is not supported yet.', 400, 'EXCEL_NOT_SUPPORTED');
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return error('File is empty', 400, 'EMPTY_FILE');

    function parseCSVLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
          else if (ch === '"') { inQuotes = false; }
          else { current += ch; }
        } else {
          if (ch === '"') { inQuotes = true; }
          else if (ch === ',') { result.push(current); current = ''; }
          else { current += ch; }
        }
      }
      result.push(current);
      return result;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const fieldMap: Record<string, string> = { code: 'code', project: 'project', type: 'type', date: 'date', party: 'party', amount: 'amount', related: 'related', tags: 'tags' };

    const records: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const field = fieldMap[h] || h;
        row[field] = (values[idx] || '').trim();
      });
      if (!row.code && !row.project) continue;
      records.push({
        code: row.code || '', project: row.project || '', type: row.type || '',
        date: row.date || '', party: row.party || '', amount: row.amount || '',
        related: row.related ? row.related.split(';').map(s => s.trim()).filter(Boolean) : [],
        tags: row.tags ? row.tags.split(';').map(s => s.trim()).filter(Boolean) : [],
      });
    }

    await logActivity(env, user.id, 'import_url', `Imported ${records.length} records from URL`, null, wsId);
    return json({ records, total: records.length });
  }

  // POST /api/records/reorder
  if (method === 'POST' && path === 'reorder') {
    const body = await request.json() as { ids: number[]; workspace_id?: number };
    if (!Array.isArray(body.ids)) return error('ids array required', 400, 'MISSING_IDS');

    const wsId = body.workspace_id || 1;
    const roleInfo = await getWorkspaceRole(env, wsId, user.id);
    if (!roleInfo || roleLevel(roleInfo.role) < roleLevel('editor')) {
      return error('Reordering records requires "editor" role or higher', 403, 'INSUFFICIENT_ROLE');
    }

    const statements = body.ids.map((recordId, index) =>
      env.DB.prepare('UPDATE records SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?')
        .bind(index, recordId, wsId)
    );
    await env.DB.batch(statements);

    await logActivity(env, user.id, 'reorder', `Reordered ${body.ids.length} records`);
    return json({ ok: true });
  }

  // POST /api/records/renumber
  if (method === 'POST' && path === 'renumber') {
    const body = await request.json() as { records: { id: number; newCode: string }[] };
    if (!Array.isArray(body.records) || body.records.length === 0) return error('records array required', 400, 'MISSING_RECORDS');

    const firstRecord = await env.DB.prepare('SELECT workspace_id FROM records WHERE id = ?').bind(body.records[0].id).first<{ workspace_id: number }>();
    const wsId = firstRecord?.workspace_id;

    if (wsId) {
      const roleInfo = await getWorkspaceRole(env, wsId, user.id);
      if (!roleInfo || roleLevel(roleInfo.role) < roleLevel('editor')) {
        return error('Renumbering records requires "editor" role or higher', 403, 'INSUFFICIENT_ROLE');
      }
    }

    const statements = body.records
      .filter(u => u.id && u.newCode)
      .map(u => env.DB.prepare("UPDATE records SET code = ?, updated_at = datetime('now') WHERE id = ?").bind(u.newCode, u.id));
    if (statements.length > 0) await env.DB.batch(statements);

    await logActivity(env, user.id, 'renumber', `Renumbered ${body.records.length} records`);
    return json({ ok: true, count: body.records.length });
  }

  // POST /api/records/restore
  if (method === 'POST' && path === 'restore') {
    const body = await request.json() as { records: Record<string, unknown>[]; workspace_id?: number };
    if (!Array.isArray(body.records)) return error('records array required', 400, 'MISSING_RECORDS');

    const wsId = body.workspace_id || 1;
    await env.DB.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(wsId, user.id, 'member').run();

    const roleInfo = await getWorkspaceRole(env, wsId, user.id);
    if (!roleInfo) return error('Not a member of this workspace', 403, 'FORBIDDEN');
    if (roleLevel(roleInfo.role) < roleLevel('admin')) return error('Restore requires "admin" role or higher', 403, 'INSUFFICIENT_ROLE');

    const statements = [
      env.DB.prepare('DELETE FROM records WHERE workspace_id = ?').bind(wsId),
      ...body.records.map(r =>
        env.DB.prepare(
          `INSERT INTO records (code, project, type, date, party, amount, related, tags, image, color, sort_order, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          r.code, r.project, r.type || '', r.date || '', r.party || '', r.amount || '',
          JSON.stringify(r.related || []), JSON.stringify(r.tags || []),
          r.image || '', r.color || '', r.sort_order || 0, wsId, user.id
        )
      ),
    ];
    await env.DB.batch(statements);

    await logActivity(env, user.id, 'restore', `Restored ${body.records.length} records`, null, wsId);
    return json({ ok: true, count: body.records.length });
  }

  // Routes with :id parameter - extract from path
  const idMatch = path.match(/^(\d+)(\/.*)?$/);
  if (idMatch) {
    const recordId = parseInt(idMatch[1]);
    const subPath = (idMatch[2] || '').replace(/^\//, '');

    // PUT /api/records/:id
    if (method === 'PUT' && subPath === '') {
      const existing = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      if (!existing) return error('Record not found', 404, 'NOT_FOUND');

      const roleInfo = await getWorkspaceRole(env, existing.workspace_id as number, user.id);
      if (!roleInfo) return error('Not a member of this workspace', 403, 'FORBIDDEN');
      if (roleLevel(roleInfo.role) < roleLevel('editor')) return error('Editing records requires "editor" role or higher', 403, 'INSUFFICIENT_ROLE');

      const body = sanitizeObject(await request.json() as Record<string, unknown>);
      const { code, project, type, date, party, amount, related, tags, image, color, notes } = body;

      if (code && code !== existing.code) {
        const dup = await env.DB.prepare('SELECT id FROM records WHERE code = ? AND id != ? AND workspace_id = ?').bind(code, recordId, existing.workspace_id).first();
        if (dup) return error(`Code "${code}" already exists in this workspace`, 409, 'DUPLICATE_CODE');
      }

      await saveRecordVersion(env, user.id, existing, existing.workspace_id as number, 'Edited record');

      await env.DB.prepare(
        `UPDATE records SET code=?, project=?, type=?, date=?, party=?, amount=?, related=?, tags=?, image=?, color=?, notes=?, updated_at=datetime('now') WHERE id=?`
      ).bind(
        code ?? existing.code, project ?? existing.project, type ?? existing.type,
        date ?? existing.date, party ?? existing.party, amount ?? existing.amount,
        JSON.stringify(related ?? JSON.parse((existing.related as string) || '[]')),
        JSON.stringify(tags ?? JSON.parse((existing.tags as string) || '[]')),
        image ?? existing.image, color ?? existing.color,
        notes ?? ((existing.notes as string) || ''), recordId
      ).run();

      const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      await logActivity(env, user.id, 'update', `Updated record ${record?.code}`, recordId);
      await triggerWebhooks(env, record!.workspace_id as number, 'record:updated', parseRecord(record!));
      await notifyWorkspace(env, record!.workspace_id as number, 'record:updated', parseRecord(record!) as { code: string }, user.id);

      return json(parseRecord(record!));
    }

    // POST /api/records/:id/favorite
    if (method === 'POST' && subPath === 'favorite') {
      const existing = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      if (!existing) return error('Record not found', 404, 'NOT_FOUND');

      const newFav = existing.is_favorite ? 0 : 1;
      await env.DB.prepare('UPDATE records SET is_favorite = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(newFav, recordId).run();
      const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      await triggerWebhooks(env, record!.workspace_id as number, 'record:updated', parseRecord(record!));
      return json(parseRecord(record!));
    }

    // POST /api/records/:id/lock
    if (method === 'POST' && subPath === 'lock') {
      const existing = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      if (!existing) return error('Record not found', 404, 'NOT_FOUND');

      if (existing.locked_by && existing.locked_by !== user.id) {
        const locker = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(existing.locked_by).first<{ username: string }>();
        return error(`Record is locked by ${locker?.username || 'another user'}`, 409, 'RECORD_LOCKED');
      }

      await env.DB.prepare('UPDATE records SET locked_by = ?, locked_at = datetime(\'now\') WHERE id = ?').bind(user.id, recordId).run();
      const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      return json(parseRecord(record!));
    }

    // POST /api/records/:id/unlock
    if (method === 'POST' && subPath === 'unlock') {
      const existing = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      if (!existing) return error('Record not found', 404, 'NOT_FOUND');

      if (existing.locked_by && existing.locked_by !== user.id) {
        return error('Only the lock owner can unlock', 403, 'FORBIDDEN');
      }

      await env.DB.prepare('UPDATE records SET locked_by = NULL, locked_at = NULL WHERE id = ?').bind(recordId).run();
      const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      return json(parseRecord(record!));
    }

    // GET /api/records/:id/versions
    if (method === 'GET' && subPath === 'versions') {
      const existing = await env.DB.prepare('SELECT id FROM records WHERE id = ?').bind(recordId).first();
      if (!existing) return error('Record not found', 404, 'NOT_FOUND');

      const { results: versions } = await env.DB.prepare(
        `SELECT id, record_id, user_name, change_summary, created_at FROM record_versions WHERE record_id = ? ORDER BY created_at DESC LIMIT 50`
      ).bind(recordId).all();
      return json(versions);
    }

    // POST /api/records/:id/versions/:versionId/restore
    const versionRestoreMatch = subPath.match(/^versions\/(\d+)\/restore$/);
    if (method === 'POST' && versionRestoreMatch) {
      const versionId = parseInt(versionRestoreMatch[1]);
      const existing = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      if (!existing) return error('Record not found', 404, 'NOT_FOUND');

      const version = await env.DB.prepare('SELECT * FROM record_versions WHERE id = ? AND record_id = ?').bind(versionId, recordId).first();
      if (!version) return error('Version not found', 404, 'NOT_FOUND');

      const roleInfo = await getWorkspaceRole(env, existing.workspace_id as number, user.id);
      if (!roleInfo) return error('Not a member of this workspace', 403, 'FORBIDDEN');
      if (roleLevel(roleInfo.role) < roleLevel('editor')) return error('Editing records requires "editor" role or higher', 403, 'INSUFFICIENT_ROLE');

      const snapshot = JSON.parse(version.snapshot as string);

      await env.DB.prepare(
        `UPDATE records SET code=?, project=?, type=?, date=?, party=?, amount=?, related=?, tags=?, image=?, color=?, updated_at=datetime('now') WHERE id=?`
      ).bind(
        snapshot.code, snapshot.project, snapshot.type, snapshot.date,
        snapshot.party, snapshot.amount, snapshot.related, snapshot.tags,
        snapshot.image, snapshot.color, recordId
      ).run();

      const restored = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
      await saveRecordVersion(env, user.id, restored!, existing.workspace_id as number, 'Restored version');
      await logActivity(env, user.id, 'restore_version', `Restored version ${versionId} of record ${restored!.code}`, recordId);
      return json(parseRecord(restored!));
    }
  }

  return error('Not found', 404, 'NOT_FOUND');
}
