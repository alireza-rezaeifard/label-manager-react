export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
  }
}

let _db = null;
let _rebuildFTS5 = null;

export function setDB(dbRef) {
  _db = dbRef;
}

export function setFTS5Rebuilder(fn) {
  _rebuildFTS5 = fn;
}

function forceDropFTS5(db) {
  try { db.exec(`DROP TRIGGER IF EXISTS records_fts_insert`); } catch {}
  try { db.exec(`DROP TRIGGER IF EXISTS records_fts_update`); } catch {}
  try { db.exec(`DROP TRIGGER IF EXISTS records_fts_delete`); } catch {}
  try { db.exec(`DROP TABLE IF EXISTS records_fts`); } catch {}
  try {
    db.pragma('writable_schema = ON');
    db.exec(`DELETE FROM sqlite_master WHERE name = 'records_fts'`);
    db.pragma('writable_schema = OFF');
  } catch {}
}

export function errorHandler(err, req, res, _next) {
  if (err.isOperational) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed', code: 'CORS_ERROR' });
  }

  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large', code: 'FILE_TOO_LARGE' });
  }

  // FTS5 virtual table corruption
  if (err.code === 'SQLITE_CORRUPT_VTAB' || err.message?.includes('records_fts') || err.message?.includes('malformed')) {
    console.error('[FTS5 CORRUPTION]', err.message);

    // Force-drop FTS5 first (even if corrupted)
    if (_db) {
      forceDropFTS5(_db);
      console.log('[FTS5] Force-dropped corrupted FTS5');
    }

    // Then rebuild
    if (_rebuildFTS5) {
      try {
        _rebuildFTS5();
        console.log('[FTS5] Rebuilt successfully. Retry your request.');
        return res.status(503).json({
          error: 'Search index was corrupted and has been rebuilt. Please try again.',
          code: 'FTS5_REBUILT',
        });
      } catch (rebuildErr) {
        console.error('[FTS5] Rebuild failed:', rebuildErr.message);
      }
    }

    return res.status(503).json({
      error: 'Search index is corrupted. Please restart the server.',
      code: 'FTS5_CORRUPTED',
    });
  }

  // SQLite / database errors
  if (err.code === 'SQLITE_ERROR' || err.message?.includes('SQLITE') || err.message?.includes('database')) {
    const isCorrupt = err.message?.includes('malformed') || err.message?.includes('corrupt') || err.message?.includes('disk image');

    if (isCorrupt && _db) {
      forceDropFTS5(_db);
    }

    console.error('[DB ERROR]', err);

    return res.status(isCorrupt ? 503 : 500).json({
      error: isCorrupt
        ? 'Database is temporarily unavailable. Recovery is in progress.'
        : 'A database error occurred. Please try again.',
      code: isCorrupt ? 'DATABASE_CORRUPTED' : 'DATABASE_ERROR',
    });
  }

  // better-sqlite3 specific errors
  if (err.message?.includes(' SQLITE_')) {
    console.error('[SQL ERROR]', err);
    return res.status(500).json({
      error: 'A database error occurred',
      code: 'DATABASE_ERROR',
    });
  }

  console.error('[ERROR]', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}

export function notFoundHandler(req, res) {
  if (!req.path.startsWith('/api')) return;
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
