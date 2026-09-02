/**
 * Centralized, validated environment configuration.
 *
 * Rules:
 * - In production, missing critical variables are fatal (fail fast).
 * - In development/test, sensible defaults are applied with warnings.
 * - No other module may read process.env directly for these values.
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const problems = [];

function requireSecret(name) {
  const value = process.env[name];
  if (!value) {
    if (isProduction) problems.push(`${name} is required in production`);
    return undefined;
  }
  if (value.length < 32 && isProduction && !isTest) {
    problems.push(`${name} should be at least 32 characters in production`);
  }
  return value;
}

function parsePort(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const port = parseInt(raw, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    problems.push(`${name} must be an integer between 1 and 65535 (got: "${raw}")`);
    return fallback;
  }
  return port;
}

function parseOrigins(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0) {
    problems.push(`${name} must contain at least one origin when set`);
    return fallback;
  }
  return origins;
}

const config = {
  NODE_ENV,
  isProduction,
  isTest,
  PORT: parsePort('PORT', 3001),
  JWT_SECRET: requireSecret('JWT_SECRET'),
  // Access-token lifetime. Short-lived by default; override via JWT_EXPIRES_IN.
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  ALLOWED_ORIGINS: parseOrigins('ALLOWED_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://localhost:3001',
  ]),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  LOG_LEVEL: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // Hard cap on request body size.
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || '10mb',
  // Idempotency keys older than this are purged (hours).
  IDEMPOTENCY_TTL_HOURS: parsePort('IDEMPOTENCY_TTL_HOURS', 24),
};

if (problems.length > 0) {
  const message = `Invalid configuration:\n  - ${problems.join('\n  - ')}`;
  if (isProduction) {
    console.error(`FATAL: ${message}`);
    process.exit(1);
  } else if (!isTest) {
    console.warn(`WARNING: ${message}`);
  }
}

export default config;
