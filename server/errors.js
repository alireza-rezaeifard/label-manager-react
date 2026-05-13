export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
  }
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
