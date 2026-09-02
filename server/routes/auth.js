import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
    const userId = result.lastInsertRowid;
    const user = { id: userId, username, role: 'user' };

    const defaultWs = db.prepare('SELECT id FROM workspaces WHERE id = 1').get();
    if (defaultWs) {
      db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').run(userId, 'editor');
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Per-account brute-force protection (audit S7) ──
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

function isLocked(user) {
  if (!user?.locked_until) return false;
  return new Date(user.locked_until).getTime() > Date.now();
}

function registerFailedLogin(user) {
  const attempts = (user.failed_login_attempts || 0) + 1;
  const lockedUntil =
    attempts >= MAX_FAILED_LOGINS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      : user.locked_until;
  db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?')
    .run(attempts, lockedUntil, user.id);
  return attempts;
}

function clearFailedLogins(user) {
  db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?')
    .run(user.id);
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  // Same response whether the account exists or not (no user enumeration).
  if (user && isLocked(user)) {
    const retryAfterMin = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${retryAfterMin} minute(s).`,
      code: 'ACCOUNT_LOCKED',
    });
  }

  if (!user || !bcrypt.compareSync(password, user.password)) {
    if (user) registerFailedLogin(user);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  clearFailedLogins(user);

  const defaultWs = db.prepare('SELECT id FROM workspaces WHERE id = 1').get();
  if (defaultWs) {
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').run(user.id, 'editor');
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'رمز عبور فعلی و جدید را وارد کنید' });
  }

  const pwError = validatePassword(newPassword);
  if (pwError) {
    return res.status(400).json({ error: pwError });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ ok: true, message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (err) {
    res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
  }
});

export default router;
