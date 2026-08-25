import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import app from '../index.js';
import db from '../db.js';

let adminToken;
let otherToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = res.body.token;

  // Second user — NOT a member of admin's workspace
  const suffix = Date.now();
  await request(app)
    .post('/api/auth/register')
    .send({ username: `outsider_${suffix}`, password: 'testpass123' });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: `outsider_${suffix}`, password: 'testpass123' });
  otherToken = login.body.token;
});

function seedArtifact(userId, workspaceId) {
  const publicId = crypto.randomUUID();
  const dir = path.join(process.cwd(), 'uploads', 'ai-artifacts', String(workspaceId));
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${publicId}.pdf`);
  const bytes = Buffer.from('%PDF-1.4 test-bytes');
  fs.writeFileSync(filePath, bytes);
  db.prepare(
    `INSERT INTO ai_artifacts (public_id, workspace_id, user_id, filename, mime_type, size, storage_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(publicId, workspaceId, userId, 'report.pdf', 'application/pdf', bytes.length, filePath);
  return publicId;
}

describe('AI artifacts — authorization', () => {
  it('rejects unauthenticated download', async () => {
    const publicId = seedArtifact(1, 1);
    const res = await request(app).get(`/api/artifacts/${publicId}/download`);
    expect([401, 403]).toContain(res.status);
  });

  it('returns 404 for a missing artifact', async () => {
    const res = await request(app)
      .get('/api/artifacts/does-not-exist/download')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ARTIFACT_NOT_FOUND');
  });

  it('allows a workspace member to download the real bytes', async () => {
    const publicId = seedArtifact(1, 1); // admin owns workspace 1
    const res = await request(app)
      .get(`/api/artifacts/${publicId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.toString()).toContain('%PDF-1.4');
  });

  it('forbids a non-member of the workspace', async () => {
    // Fresh workspace owned by admin — outsider is NOT a member of it
    const ws = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `iso-ws-${Date.now()}`, description: '' });
    const publicId = seedArtifact(1, ws.body.id);
    const res = await request(app)
      .get(`/api/artifacts/${publicId}/download`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ARTIFACT_FORBIDDEN');
  });

  it('rejects path traversal in the artifact id', async () => {
    const res = await request(app)
      .get('/api/artifacts/..%2F..%2Fetc%2Fpasswd/download')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([404, 400]).toContain(res.status);
  });
});

describe('AI chat — workspace validation', () => {
  it('rejects chat requests for a workspace the user does not belong to', async () => {
    // Create a workspace as admin, then try as outsider
    const ws = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `sec-ws-${Date.now()}`, description: '' });
    const wsId = ws.body.id;

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        messages: [{ role: 'user', content: 'hello' }],
        config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' },
        workspaceId: wsId,
      });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('WORKSPACE_ACCESS_DENIED');
  });

  it('rejects invalid workspace ids', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        messages: [{ role: 'user', content: 'hello' }],
        config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' },
        workspaceId: 999999,
      });
    expect([400, 403]).toContain(res.status);
  });
});
