import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';

let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = res.body.token;
});

describe('Health endpoint', () => {
  it('should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('version');
  });
});

describe('Auth', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `newuser_${Date.now()}`, password: 'testpass123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username');
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('admin');
  });

  it('should reject registration with weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `weak_${Date.now()}`, password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6 characters');
  });

  it('should reject registration with password without number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `nonumber_${Date.now()}`, password: 'abcdefgh' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('number');
  });

  it('should reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('should reject protected routes without token', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  it('should reject protected routes with invalid token', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });
});

describe('Records CRUD', () => {
  let recordId;

  it('should create a new record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'CRD001',
        project: 'Test Project',
        type: 'test',
        date: '2026-01-01',
        party: 'Test Party',
        amount: '100',
      });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('CRD001');
    expect(res.body.project).toBe('Test Project');
    expect(Array.isArray(res.body.related)).toBe(true);
    expect(Array.isArray(res.body.tags)).toBe(true);
    recordId = res.body.id;
  });

  it('should get records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('records');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records.length).toBeGreaterThanOrEqual(1);
  });

  it('should update a record', async () => {
    const res = await request(app)
      .put(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ project: 'Updated Project', party: 'Updated Party' });
    expect(res.status).toBe(200);
    expect(res.body.project).toBe('Updated Project');
    expect(res.body.party).toBe('Updated Party');
    expect(res.body.code).toBe('CRD001');
  });

  it('should return 404 for updating non-existent record', async () => {
    const res = await request(app)
      .put('/api/records/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ project: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('should delete records in batch', async () => {
    const res = await request(app)
      .delete('/api/records/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [recordId] });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
  });
});

describe('Duplicate code detection', () => {
  it('should return 409 for duplicate code in POST', async () => {
    await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'DUP001', project: 'First' });

    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'DUP001', project: 'Second' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_CODE');
  });
});

describe('Auth extended', () => {
  it('should get current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username');
    expect(res.body.username).toBe('admin');
  });

  it('should reject getting profile without auth', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should change password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'newadmin456' });
    expect(res.status).toBe(200);

    // change back
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'newadmin456', newPassword: 'admin123' });
  });

  it('should reject password change with wrong current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'testpass123' });
    expect(res.status).toBe(401);
  });

  it('should reject password change with weak new password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'abc' });
    expect(res.status).toBe(400);
  });
});

describe('Version History', () => {
  let recordId;

  it('should create a record for version testing', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'VER001', project: 'Version Test' });
    expect(res.status).toBe(201);
    recordId = res.body.id;
  });

  it('should list versions for a record', async () => {
    const res = await request(app)
      .get(`/api/records/${recordId}/versions`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('change_summary');
    expect(res.body[0]).toHaveProperty('created_at');
  });

  it('should restore a version', async () => {
    const versions = await request(app)
      .get(`/api/records/${recordId}/versions`)
      .set('Authorization', `Bearer ${token}`);
    const versionId = versions.body[0].id;

    const res = await request(app)
      .post(`/api/records/${recordId}/versions/${versionId}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('VER001');
  });

  it('should reject restoring non-existent version', async () => {
    const res = await request(app)
      .post(`/api/records/${recordId}/versions/99999/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Workspaces', () => {
  let workspaceId;

  it('should list workspaces', async () => {
    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should create a workspace', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Workspace', description: 'A test workspace' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Workspace');
    expect(res.body.member_role).toBe('owner');
    workspaceId = res.body.id;
  });

  it('should reject workspace creation without name', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
  });

  it('should get workspace members', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((m) => m.username === 'admin')).toBe(true);
  });

  it('should invite a user to workspace', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: `invitee_${Date.now()}`, password: 'testpass123' });
    const inviteeUsername = registerRes.body.user.username;

    const res = await request(app)
      .post('/api/workspaces/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspace_id: workspaceId, username: inviteeUsername });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should reject inviting non-existent user', async () => {
    const res = await request(app)
      .post('/api/workspaces/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspace_id: workspaceId, username: 'nonexistent_user_xyz' });
    expect(res.status).toBe(404);
  });

  it('should reject workspace access without auth', async () => {
    const res = await request(app).get('/api/workspaces');
    expect(res.status).toBe(401);
  });

  it('should delete workspace', async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Custom Fields', () => {
  it('should list custom fields', async () => {
    const res = await request(app)
      .get('/api/custom-fields')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create a custom field', async () => {
    const res = await request(app)
      .post('/api/custom-fields')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'test_field', label: 'Test Field', fieldType: 'text', placeholder: 'Enter value' });
    expect(res.status).toBe(201);
    expect(res.body.key).toBe('test_field');
    expect(res.body.label).toBe('Test Field');
  });

  it('should reject creating duplicate custom field', async () => {
    const res = await request(app)
      .post('/api/custom-fields')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'test_field', label: 'Duplicate', fieldType: 'text' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_KEY');
  });

  it('should reject custom field without key', async () => {
    const res = await request(app)
      .post('/api/custom-fields')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'No Key', fieldType: 'text' });
    expect(res.status).toBe(400);
  });

  it('should update a custom field', async () => {
    const res = await request(app)
      .put('/api/custom-fields/test_field')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Updated Field', placeholder: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Updated Field');
  });

  it('should delete a custom field', async () => {
    const res = await request(app)
      .delete('/api/custom-fields/test_field')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should save batch of custom fields', async () => {
    const res = await request(app)
      .post('/api/custom-fields/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fields: [
          { key: 'batch1', label: 'Batch 1', fieldType: 'text' },
          { key: 'batch2', label: 'Batch 2', fieldType: 'number' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.count).toBe(2);
  });

  it('should reject custom field access without auth', async () => {
    const res = await request(app).get('/api/custom-fields');
    expect(res.status).toBe(401);
  });
});

describe('Rate limiting', () => {
  it('should rate-limit excessive requests to auth endpoints', async () => {
    const requests = [];
    for (let i = 0; i < 12; i++) {
      requests.push(
        request(app)
          .post('/api/auth/register')
          .send({})
      );
    }
    const results = await Promise.all(requests);
    const rateLimited = results.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThanOrEqual(1);
    if (rateLimited.length > 0) {
      expect(rateLimited[0].body.code).toBe('AUTH_RATE_LIMIT');
    }
  });
});
