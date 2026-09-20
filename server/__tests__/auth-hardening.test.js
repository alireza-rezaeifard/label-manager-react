import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

/**
 * Hardening coverage for the production pass (docs/audit/…):
 * username validation on register + refresh-token revocation on password
 * change. Kept in its own file so the per-IP auth rate limiter quota
 * (10 req / 15 min, exercised by records.test.js) cannot interfere —
 * this file uses 4 limited-endpoint requests, well under quota.
 */

const uniq = (p) => `${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

describe('Auth hardening', () => {
  it('should reject registration with a too-short username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'goodpass1' });
    expect(res.status).toBe(400);
  });

  it('should reject registration with a blank username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: '   ', password: 'goodpass1' });
    expect(res.status).toBe(400);
  });

  it('should revoke refresh tokens when the password changes', async () => {
    const username = uniq('pwchange');
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'goodpass1' });
    expect(reg.status).toBe(200);
    const accessToken = reg.body.token;
    const refreshToken = reg.body.refreshToken;
    expect(refreshToken).toBeTruthy();

    // Sanity: the refresh token works before the password change.
    const pre = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(pre.status).toBe(200);
    expect(pre.body.refreshToken).toBeTruthy();

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'goodpass1', newPassword: 'newpass2' });
    expect(changed.status).toBe(200);

    // Both the original and the rotated refresh token are now dead.
    for (const rt of [refreshToken, pre.body.refreshToken]) {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: rt });
      expect(res.status).toBe(401);
    }

    // The user can still log in with the new password (account intact).
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'newpass2' });
    expect(login.status).toBe(200);
  });
});
