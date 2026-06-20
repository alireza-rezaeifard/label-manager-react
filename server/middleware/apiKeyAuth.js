import db from '../db.js';

export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return next();
  }

  const keyRow = db.prepare(
    `SELECT ak.*, u.id as uid, u.username, u.role
     FROM api_keys ak
     JOIN users u ON ak.user_id = u.id
     WHERE ak.key = ?`
  ).get(apiKey);

  if (!keyRow) {
    return res.status(401).json({ error: 'Invalid API key', code: 'INVALID_API_KEY' });
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return res.status(401).json({ error: 'API key expired', code: 'API_KEY_EXPIRED' });
  }

  req.user = { id: keyRow.user_id, username: keyRow.username, role: keyRow.role };
  next();
}
