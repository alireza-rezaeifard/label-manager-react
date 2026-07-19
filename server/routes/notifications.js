import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../errors.js';

const router = Router();
router.use(authMiddleware);

router.get('/preferences', asyncHandler((req, res) => {
  let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
  if (!prefs) {
    db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').run(req.user.id);
    prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
  }
  res.json(prefs);
}));

router.put('/preferences', asyncHandler((req, res) => {
  const { email, on_create, on_update, on_delete } = req.body;

  db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').run(req.user.id);

  db.prepare(`
    UPDATE notification_preferences SET
      email = COALESCE(?, email),
      on_create = COALESCE(?, on_create),
      on_update = COALESCE(?, on_update),
      on_delete = COALESCE(?, on_delete)
    WHERE user_id = ?
  `).run(email ?? null, on_create ?? null, on_update ?? null, on_delete ?? null, req.user.id);

  const prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
  res.json(prefs);
}));

export default router;
