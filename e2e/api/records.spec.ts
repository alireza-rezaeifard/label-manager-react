import { test, expect } from '@playwright/test';

const uniq = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

async function register(request, username: string) {
  const res = await request.post('/api/auth/register', {
    data: { username, password: 'goodpass1' },
  });
  expect(res.status()).toBe(200);
  const { token } = await res.json();
  return { token, auth: { Authorization: `Bearer ${token}` } };
}

test.describe('records', () => {
  test('creates, rejects duplicates, updates and soft-deletes records', async ({ request }) => {
    const { auth } = await register(request, uniq());
    const code = uniq();

    const created = await request.post('/api/records', {
      headers: auth,
      data: { code, project: 'E2E Project', type: 'invoice', amount: '150000', workspace_id: 1 },
    });
    expect(created.status()).toBe(201);
    const record = await created.json();
    expect(record.code).toBe(code);
    expect(record.id).toBeTruthy();

    // Duplicate code in same workspace → 409
    const dup = await request.post('/api/records', {
      headers: auth,
      data: { code, project: 'Second', workspace_id: 1 },
    });
    expect(dup.status()).toBe(409);
    expect((await dup.json()).code).toBe('DUPLICATE_CODE');

    // Update
    const updated = await request.put(`/api/records/${record.id}`, {
      headers: auth,
      data: { amount: '200000' },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).amount).toBe('200000');

    // Soft delete via batch
    const del = await request.delete('/api/records/batch', {
      headers: auth,
      data: { ids: [record.id] },
    });
    expect(del.status()).toBe(200);
    expect((await del.json()).deleted).toBe(1);

    // Record is in trash, restorable
    const trash = await request.get('/api/records/trash?workspace_id=1', { headers: auth });
    const trashBody = await trash.json();
    expect(trashBody.map((r: any) => r.id)).toContain(record.id);
  });

  test('supports idempotent creation via Idempotency-Key', async ({ request }) => {
    const { auth } = await register(request, uniq());
    const key = uniq();

    const first = await request.post('/api/records', {
      headers: { ...auth, 'Idempotency-Key': key },
      data: { code: uniq(), project: 'Idem Project', workspace_id: 1 },
    });
    expect(first.status()).toBe(201);
    const firstBody = await first.json();

    const replay = await request.post('/api/records', {
      headers: { ...auth, 'Idempotency-Key': key },
      data: { code: uniq(), project: 'Idem Project', workspace_id: 1 },
    });
    expect(replay.status()).toBe(201);
    expect(replay.headers()['idempotency-replayed']).toBe('true');
    const replayBody = await replay.json();

    // Same record returned — no duplicate created
    expect(replayBody.id).toBe(firstBody.id);
  });

  test('respects bounded pagination limits', async ({ request }) => {
    const { auth } = await register(request, uniq());
    const res = await request.get('/api/records?limit=5000&workspace_id=1', { headers: auth });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Hard cap: unbounded payloads are never returned (audit A2)
    expect(body.records.length).toBeLessThanOrEqual(1000);
  });
});
