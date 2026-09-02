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

test.describe('workspace isolation', () => {
  test('non-members cannot read or modify another workspace\'s records', async ({ request }) => {
    const owner = await register(request, uniq());
    const outsider = await register(request, uniq());

    // Owner creates a private workspace and a record inside it
    const ws = await request.post('/api/workspaces', {
      headers: owner.auth,
      data: { name: `Private ${uniq()}` },
    });
    expect(ws.status()).toBe(201);
    const workspace = await ws.json();

    const created = await request.post('/api/records', {
      headers: owner.auth,
      data: { code: uniq(), project: 'Secret', workspace_id: workspace.id },
    });
    expect(created.status()).toBe(201);
    const record = await created.json();

    // Outsider is NOT a member: record update must be forbidden
    const put = await request.put(`/api/records/${record.id}`, {
      headers: outsider.auth,
      data: { amount: '999' },
    });
    expect(put.status()).toBe(403);

    // Outsider cannot delete it either
    const del = await request.delete('/api/records/batch', {
      headers: outsider.auth,
      data: { ids: [record.id] },
    });
    expect(del.status()).toBe(403);

    // Outsider's list for that workspace returns nothing of the owner's
    const list = await request.get(`/api/records?workspace_id=${workspace.id}`, {
      headers: outsider.auth,
    });
    expect(list.status()).toBe(200);
    const body = await list.json();
    expect(body.records.map((r: any) => r.id)).not.toContain(record.id);

    // Owner can still modify their own record
    const ownerPut = await request.put(`/api/records/${record.id}`, {
      headers: owner.auth,
      data: { amount: '500' },
    });
    expect(ownerPut.status()).toBe(200);
  });
});
