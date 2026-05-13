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
