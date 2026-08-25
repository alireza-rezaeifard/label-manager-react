import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import fs from 'fs';

/* HERMES_URL must be set BEFORE the app (and its routes) are imported —
   the proxy captures it at module scope. */
process.env.HERMES_URL = 'http://127.0.0.1:3999';

const { default: request } = await import('supertest');
const { default: app } = await import('../index.js');
const { default: db } = await import('../db.js');

const FAKE_PDF = Buffer.from('%PDF-1.4 fake-report-bytes');
let adminToken;
let mockHermes;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = res.body.token;

  // Mock Hermes: tool-call → artifact (base64) → text → done
  mockHermes = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ type: 'tool-call', toolName: 'generate_monthly_report', args: {} })}\n\n`);
    res.write(`data: ${JSON.stringify({
      type: 'artifact',
      filename: 'taxbook-report.pdf',
      mime_type: 'application/pdf',
      size: FAKE_PDF.length,
      data_base64: FAKE_PDF.toString('base64'),
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'text-delta', text: 'گزارش آماده شد.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  });
  await new Promise(resolve => mockHermes.listen(3999, '127.0.0.1', resolve));
});

afterAll(() => {
  mockHermes?.close();
});

describe('AI chat proxy — artifact interception', () => {
  it('replaces base64 artifact payloads with workspace-scoped metadata', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        messages: [{ role: 'user', content: 'گزارش بساز' }],
        config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' },
        workspaceId: 1,
      });

    const body = res.text;
    const events = body.split('\n\n').filter(Boolean).map(l => JSON.parse(l.replace(/^data: /, '')));
    const artifactEvent = events.find(e => e.type === 'artifact');

    expect(artifactEvent).toBeTruthy();
    expect(artifactEvent.artifact).toBeTruthy();
    expect(artifactEvent.artifact.filename).toBe('taxbook-report.pdf');
    expect(artifactEvent.artifact.url).toMatch(/^\/api\/artifacts\//);
    // base64 must NOT leak into the chat stream
    expect(body).not.toContain(FAKE_PDF.toString('base64'));
    expect(artifactEvent.data_base64).toBeUndefined();

    // The stored file downloads with the real bytes
    const dl = await request(app)
      .get(`${artifactEvent.artifact.url}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dl.status).toBe(200);
    expect(dl.body.toString()).toContain('%PDF-1.4');

    // DB row is workspace-scoped
    const row = db.prepare('SELECT workspace_id FROM ai_artifacts WHERE public_id = ?')
      .get(artifactEvent.artifact.id);
    expect(row.workspace_id).toBe(1);

    // Cleanup stored file
    const meta = db.prepare('SELECT storage_path FROM ai_artifacts WHERE public_id = ?')
      .get(artifactEvent.artifact.id);
    try { fs.unlinkSync(meta.storage_path); } catch { /* ignore */ }
  });
});
