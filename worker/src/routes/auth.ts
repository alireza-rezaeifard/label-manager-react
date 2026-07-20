import type { Env, JWTPayload } from '../auth';
import { signJWT, json, error, authenticateRequest } from '../auth';
import { sanitizeObject } from '../utils/sanitize';

function validatePassword(password: string): string | null {
  if (!password || password.length < 6) return 'Password must be at least 6 characters';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Use bcryptjs-compatible hash via a simple SHA-256 + salt approach
  // For production, consider using a WASM bcrypt module
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey('raw', data, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, salt);
  const hash = Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
  return `$sha256$${saltHex}$${hash}`;
}

async function comparePassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$sha256$')) {
    const parts = stored.split('$');
    const saltHex = parts[2];
    const expectedHash = parts[3];
    const encoder = new TextEncoder();
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, salt);
    const hash = Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
    return hash === expectedHash;
  }
  // Legacy bcrypt fallback - reject
  return false;
}

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  // POST /api/auth/register
  if (method === 'POST' && path === 'register') {
    const body = await request.json() as Record<string, string>;
    const { username, password } = body;
    if (!username || !password) return error('Username and password required', 400, 'MISSING_FIELDS');

    const pwError = validatePassword(password);
    if (pwError) return error(pwError, 400, 'INVALID_PASSWORD');

    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) return error('Username already exists', 409, 'DUPLICATE_USERNAME');

    const hash = await hashPassword(password);
    const result = await env.DB.prepare('INSERT INTO users (username, password) VALUES (?, ?)').bind(username, hash).run();
    const userId = result.meta.last_row_id as number;

    // Add to default workspace
    const defaultWs = await env.DB.prepare('SELECT id FROM workspaces WHERE id = 1').first();
    if (defaultWs) {
      await env.DB.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').bind(userId, 'editor').run();
    }

    const token = await signJWT({ id: userId, username, role: 'user' }, env.JWT_SECRET);
    return json({ token, user: { id: userId, username, role: 'user' } });
  }

  // POST /api/auth/login
  if (method === 'POST' && path === 'login') {
    const body = await request.json() as Record<string, string>;
    const { username, password } = body;
    if (!username || !password) return error('Username and password required', 400, 'MISSING_FIELDS');

    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<{
      id: number; username: string; password: string; role: string;
    }>();
    if (!user || !(await comparePassword(password, user.password))) {
      return error('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Ensure membership in default workspace
    const defaultWs = await env.DB.prepare('SELECT id FROM workspaces WHERE id = 1').first();
    if (defaultWs) {
      await env.DB.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').bind(user.id, 'editor').run();
    }

    const token = await signJWT({ id: user.id, username: user.username, role: user.role }, env.JWT_SECRET);
    return json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }

  // GET /api/auth/me
  if (method === 'GET' && path === 'me') {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    return json({ id: user.id, username: user.username, role: user.role });
  }

  // POST /api/auth/change-password
  if (method === 'POST' && path === 'change-password') {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    const body = await request.json() as Record<string, string>;
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) return error('Current and new password required', 400, 'MISSING_FIELDS');

    const pwError = validatePassword(newPassword);
    if (pwError) return error(pwError, 400, 'INVALID_PASSWORD');

    const dbUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<{
      id: number; password: string;
    }>();
    if (!dbUser || !(await comparePassword(currentPassword, dbUser.password))) {
      return error('Current password is incorrect', 401, 'WRONG_PASSWORD');
    }

    const hash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hash, user.id).run();
    return json({ ok: true, message: 'Password changed successfully' });
  }

  return error('Not found', 404, 'NOT_FOUND');
}
