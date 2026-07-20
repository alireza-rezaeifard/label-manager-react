import type { Env } from '../auth';
import { authenticateRequest, json, error } from '../auth';
import { sanitizeObject } from '../utils/sanitize';

export async function handleCustomFields(request: Request, env: Env, path: string): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const method = request.method;
  const url = new URL(request.url);

  // GET /api/custom-fields/
  if (method === 'GET' && path === '') {
    const wsId = url.searchParams.get('workspace_id');
    let fields;
    if (wsId) {
      const { results } = await env.DB.prepare('SELECT * FROM custom_fields WHERE workspace_id = ? ORDER BY sort_order ASC').bind(parseInt(wsId)).all();
      fields = results;
    } else {
      const { results } = await env.DB.prepare('SELECT * FROM custom_fields ORDER BY sort_order ASC').all();
      fields = results;
    }
    return json(fields.map((f: Record<string, unknown>) => ({
      key: f.key, label: f.label, fa: f.fa, placeholder: f.placeholder,
      fieldType: f.field_type, options: JSON.parse((f.options as string) || '[]'), isCustom: true,
    })));
  }

  // POST /api/custom-fields/
  if (method === 'POST' && path === '') {
    const body = sanitizeObject(await request.json() as Record<string, unknown>);
    const { key, label, fa, placeholder, fieldType, options, workspace_id } = body as Record<string, unknown>;
    if (!key || !(key as string).trim()) return error('Key is required', 400, 'MISSING_KEY');
    if (!label || !(label as string).trim()) return error('Label is required', 400, 'MISSING_LABEL');

    const wsId = (workspace_id as number) || 1;
    const existing = await env.DB.prepare('SELECT id FROM custom_fields WHERE workspace_id = ? AND key = ?').bind(wsId, key).first();
    if (existing) return error(`Field "${key}" already exists`, 409, 'DUPLICATE_KEY');

    const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as mx FROM custom_fields WHERE workspace_id = ?').bind(wsId).first<{ mx: number }>();
    const sortOrder = (maxOrder?.mx || 0) + 1;

    await env.DB.prepare(
      `INSERT INTO custom_fields (workspace_id, key, label, fa, placeholder, field_type, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(wsId, key, label, fa || '', placeholder || '', fieldType || 'text', JSON.stringify(options || []), sortOrder).run();

    return json({ key, label, fa, placeholder, fieldType, options, isCustom: true }, 201);
  }

  // POST /api/custom-fields/batch
  if (method === 'POST' && path === 'batch') {
    const body = await request.json() as { fields: Record<string, unknown>[]; workspace_id?: number };
    if (!Array.isArray(body.fields)) return error('fields array required', 400, 'MISSING_FIELDS');

    const wsId = body.workspace_id || 1;
    const statements = [
      env.DB.prepare('DELETE FROM custom_fields WHERE workspace_id = ?').bind(wsId),
      ...body.fields.map((f, i) =>
        env.DB.prepare(
          `INSERT INTO custom_fields (workspace_id, key, label, fa, placeholder, field_type, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(wsId, f.key, f.label, f.fa || '', f.placeholder || '', f.fieldType || 'text', JSON.stringify(f.options || []), i)
      ),
    ];
    await env.DB.batch(statements);

    return json({ ok: true, count: body.fields.length });
  }

  // Routes with :key parameter
  const keyMatch = path.match(/^([^/]+)$/);
  if (keyMatch) {
    const fieldKey = decodeURIComponent(keyMatch[1]);

    // PUT /api/custom-fields/:key
    if (method === 'PUT') {
      const body = sanitizeObject(await request.json() as Record<string, unknown>);
      const { label, fa, placeholder, fieldType, options, workspace_id } = body;
      const wsId = (workspace_id as number) || 1;

      const existing = await env.DB.prepare('SELECT id FROM custom_fields WHERE workspace_id = ? AND key = ?').bind(wsId, fieldKey).first();
      if (!existing) return error('Field not found', 404, 'NOT_FOUND');

      await env.DB.prepare(
        `UPDATE custom_fields SET label = ?, fa = ?, placeholder = ?, field_type = ?, options = ? WHERE workspace_id = ? AND key = ?`
      ).bind(label || '', fa || '', placeholder || '', fieldType || 'text', JSON.stringify(options || []), wsId, fieldKey).run();

      return json({ key: fieldKey, label, fa, placeholder, fieldType, options, isCustom: true });
    }

    // DELETE /api/custom-fields/:key
    if (method === 'DELETE') {
      const wsId = url.searchParams.get('workspace_id') || '1';
      const result = await env.DB.prepare('DELETE FROM custom_fields WHERE workspace_id = ? AND key = ?').bind(parseInt(wsId), fieldKey).run();
      if (result.meta.changes === 0) return error('Field not found', 404, 'NOT_FOUND');
      return json({ ok: true });
    }
  }

  return error('Not found', 404, 'NOT_FOUND');
}
