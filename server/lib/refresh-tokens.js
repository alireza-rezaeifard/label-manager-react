import crypto from 'crypto';
import db from '../db.js';

/**
 * Refresh-token lifecycle (audit S1).
 * - Raw tokens are returned to the client once; only a SHA-256 hash is stored.
 * - Rotation: each refresh revokes the used token and issues a new one.
 * - Reuse of a revoked token is treated as theft and revokes all user sessions.
 */

const TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10) || 30;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function issueRefreshToken(userId, userAgent) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent) VALUES (?, ?, ?, ?)'
  ).run(userId, hashToken(token), expiresAt, String(userAgent || '').slice(0, 255));
  return token;
}

/**
 * Validates and rotates a refresh token.
 * Returns { userId, refreshToken } or null if invalid/expired/reused.
 */
export function rotateRefreshToken(rawToken, userAgent) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(hashToken(rawToken));
  if (!row) return null;

  if (row.revoked_at) {
    // Replay of an already-rotated token → assume theft, kill all sessions.
    db.prepare(
      "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL"
    ).run(row.user_id);
    return null;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  const newToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
  db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?").run(row.id);
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent) VALUES (?, ?, ?, ?)'
  ).run(row.user_id, hashToken(newToken), expiresAt, row.user_agent || String(userAgent || '').slice(0, 255));

  return { userId: row.user_id, refreshToken: newToken };
}

/** Revokes a single refresh token (logout). Returns true if a live token was revoked. */
export function revokeRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return false;
  const result = db.prepare(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ? AND revoked_at IS NULL"
  ).run(hashToken(rawToken));
  return result.changes > 0;
}