import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
    const userId = result.lastInsertRowid;
    const user = { id: userId, username, role: 'user' };

    const defaultWs = db.prepare('SELECT id FROM workspaces WHERE id = 1').get();
    if (defaultWs) {
      db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').run(userId, 'member');
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const defaultWs = db.prepare('SELECT id FROM workspaces WHERE id = 1').get();
  if (defaultWs) {
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').run(user.id, 'member');
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

router.get('/me', (req, res) => {
  res.json(req.user);
});

export default router;
