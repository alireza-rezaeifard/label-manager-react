import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { authMiddleware } from './middleware/auth.js';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import { errorHandler, notFoundHandler, setFTS5Rebuilder, setDB } from './errors.js';
import { runMigrations } from './migrate.js';
import { initWebSocket } from './ws.js';
import db, { rebuildFTS5 } from './db.js';
import { createBackup, checkIntegrity, getDbPath, performCheckpoint } from './db-recovery.js';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';
import workspaceRoutes from './routes/workspaces.js';
import customFieldRoutes from './routes/custom-fields.js';
import apiKeyRoutes from './routes/api-keys.js';
import webhookRoutes from './routes/webhooks.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';
import swaggerSpec from './swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Wire up FTS5 auto-rebuild for error handler
setDB(db);
setFTS5Rebuilder(() => rebuildFTS5());

const app = express();
app.set('trust proxy', 'loopback');
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino/file', options: { destination: 1 } } : undefined,
});

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.username || 'anonymous',
    };
    if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });
  next();
};

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMIT' },
});

app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.', code: 'AUTH_RATE_LIMIT' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', apiKeyAuth, authMiddleware, express.static(uploadsDir));

const ALLOWED_MIME_TYPES = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt', 'text/csv': 'csv',
};

function handleFileUpload(req, res) {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: 'No file data', code: 'MISSING_FILE' });

  const maxSize = 5 * 1024 * 1024;
  if (Buffer.byteLength(file, 'utf8') > maxSize) {
    return res.status(400).json({ error: 'File too large (max 5MB)', code: 'FILE_TOO_LARGE' });
  }

  const dataUriMatch = file.match(/^data:([^;]+);base64,(.+)$/);
  if (!dataUriMatch) return res.status(400).json({ error: 'Invalid file data URI format', code: 'INVALID_FILE' });

  const mime = dataUriMatch[1];
  const ext = ALLOWED_MIME_TYPES[mime];
  if (!ext) return res.status(400).json({ error: `Unsupported file type: ${mime}`, code: 'UNSUPPORTED_TYPE' });

  const data = Buffer.from(dataUriMatch[2], 'base64');
  const filename = `${Date.now()}_${req.user.id}.${ext}`;
  const filepath = join(uploadsDir, filename);

  fs.writeFileSync(filepath, data);
  res.json({ url: `/uploads/${filename}` });
}

app.post('/api/upload-file', apiKeyAuth, authMiddleware, handleFileUpload);
app.post('/api/upload-image', apiKeyAuth, authMiddleware, handleFileUpload);

app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  let dbStatus = 'ok';
  let dbIntegrity = true;

  try {
    const result = db.pragma('integrity_check');
    dbIntegrity = result[0]?.integrity_check === 'ok';
    dbStatus = dbIntegrity ? 'ok' : 'corrupted';
  } catch (err) {
    dbStatus = 'error';
    dbIntegrity = false;
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    database: {
      status: dbStatus,
      integrity: dbIntegrity,
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    },
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

app.post('/api/health/checkpoint', (req, res) => {
  try {
    const dbPath = getDbPath();
    const ok = performCheckpoint(dbPath);
    res.json({ ok, message: ok ? 'Checkpoint completed' : 'Checkpoint failed' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const apiDoc = swaggerSpec;
apiDoc.paths = {};

Object.assign(apiDoc.paths, importApiPaths());
Object.assign(apiDoc.paths, authApiPaths());
Object.assign(apiDoc.paths, recordApiPaths());
Object.assign(apiDoc.paths, workspaceApiPaths());
Object.assign(apiDoc.paths, customFieldApiPaths());

app.get('/api-docs.json', (req, res) => {
  res.json(apiDoc);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiDoc, {
  customSiteTitle: 'Label Studio API Docs',
  customfavIcon: '/api-docs/favicon',
  swaggerOptions: { persistAuthorization: true },
}));

function importApiPaths() {
  return {
    '/upload-file': {
      post: {
        tags: ['Other'],
        summary: 'Upload file',
        description: 'Upload a base64-encoded file (images, pdf, doc, xls, txt, csv)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', description: 'Base64-encoded file data URI' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'File uploaded', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' } } } } } },
          400: { description: 'Invalid file data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Other'],
        summary: 'Health check',
        security: [],
        responses: {
          200: { description: 'Server status', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'number' }, timestamp: { type: 'string' }, version: { type: 'string' } } } } } },
        },
      },
    },
  };
}

function authApiPaths() {
  return {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string', minLength: 6, description: 'Must contain letters and numbers' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User registered', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, role: { type: 'string' } } } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Username already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, role: { type: 'string' } } } } } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user info',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current user data', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, role: { type: 'string' } } } } } },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change password',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 6, description: 'Must contain letters and numbers' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Wrong current password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  };
}

function recordApiPaths() {
  return {
    '/records': {
      get: {
        tags: ['Records'],
        summary: 'List records with pagination and filters',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['code', 'project', 'type', 'date', 'party', 'amount', 'created_at', 'updated_at', 'sort_order'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'party', in: 'query', schema: { type: 'string' } },
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Paginated records', content: { 'application/json': { schema: { type: 'object', properties: { records: { type: 'array', items: { $ref: '#/components/schemas/Record' } }, total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' }, totalPages: { type: 'integer' } } } } } },
        },
      },
      post: {
        tags: ['Records'],
        summary: 'Create a new record',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'project'],
                properties: {
                  code: { type: 'string' },
                  project: { type: 'string' },
                  type: { type: 'string' },
                  date: { type: 'string' },
                  party: { type: 'string' },
                  amount: { type: 'string' },
                  related: { type: 'array', items: { type: 'string' } },
                  tags: { type: 'array', items: { type: 'string' } },
                  image: { type: 'string' },
                  color: { type: 'string' },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Record created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Record' } } } },
          400: { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Duplicate code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/all': {
      get: {
        tags: ['Records'],
        summary: 'Get all records (bulk export)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 200, maximum: 1000 } },
        ],
        responses: {
          200: { description: 'All records (paginated)', content: { 'application/json': { schema: { type: 'object', properties: { records: { type: 'array', items: { $ref: '#/components/schemas/Record' } }, total: { type: 'integer' } } } } } },
        },
      },
    },
    '/records/check-code': {
      get: {
        tags: ['Records'],
        summary: 'Check if a record code already exists',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'excludeId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Duplicate check result', content: { 'application/json': { schema: { type: 'object', properties: { exists: { type: 'boolean' }, code: { type: 'string' } } } } } },
          400: { description: 'Code is required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/{id}': {
      put: {
        tags: ['Records'],
        summary: 'Update a record',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  project: { type: 'string' },
                  type: { type: 'string' },
                  date: { type: 'string' },
                  party: { type: 'string' },
                  amount: { type: 'string' },
                  related: { type: 'array', items: { type: 'string' } },
                  tags: { type: 'array', items: { type: 'string' } },
                  image: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Record updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Record' } } } },
          404: { description: 'Record not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/batch': {
      delete: {
        tags: ['Records'],
        summary: 'Batch delete records',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ids'],
                properties: {
                  ids: { type: 'array', items: { type: 'integer' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Records deleted', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'integer' } } } } } },
          400: { description: 'ids array required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/reorder': {
      post: {
        tags: ['Records'],
        summary: 'Reorder records (set sort_order)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ids'],
                properties: {
                  ids: { type: 'array', items: { type: 'integer' } },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Records reordered', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
        },
      },
    },
    '/records/renumber': {
      post: {
        tags: ['Records'],
        summary: 'Renumber records (update codes in bulk)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['records'],
                properties: {
                  records: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, newCode: { type: 'string' } } } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Records renumbered', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, count: { type: 'integer' } } } } } },
        },
      },
    },
    '/records/backup': {
      get: {
        tags: ['Records'],
        summary: 'Export all records as backup',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'All records array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Record' } } } } },
        },
      },
    },
    '/records/restore': {
      post: {
        tags: ['Records'],
        summary: 'Restore records from backup (replaces all records)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['records'],
                properties: {
                  records: { type: 'array', items: { $ref: '#/components/schemas/Record' } },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Records restored', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, count: { type: 'integer' } } } } } },
        },
      },
    },
    '/records/{id}/versions': {
      get: {
        tags: ['Records'],
        summary: 'Get version history for a record',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Version list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RecordVersion' } } } } },
          404: { description: 'Record not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/{id}/versions/{versionId}/restore': {
      post: {
        tags: ['Records'],
        summary: 'Restore a specific version of a record',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'versionId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Version restored', content: { 'application/json': { schema: { $ref: '#/components/schemas/Record' } } } },
          404: { description: 'Record or version not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/import-url': {
      post: {
        tags: ['Records'],
        summary: 'Import records from a CSV file URL',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri', description: 'URL of the CSV file to import' },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Parsed records', content: { 'application/json': { schema: { type: 'object', properties: { records: { type: 'array', items: { $ref: '#/components/schemas/Record' } }, total: { type: 'integer' } } } } } },
          400: { description: 'Invalid URL or fetch failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/activity': {
      get: {
        tags: ['Records'],
        summary: 'Get activity log',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Activity log entries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ActivityLog' } } } } },
        },
      },
    },
  };
}

function workspaceApiPaths() {
  return {
    '/workspaces': {
      get: {
        tags: ['Workspaces'],
        summary: 'List user workspaces',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Workspace list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Workspace' } } } } },
        },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Create a workspace',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Workspace created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Workspace' } } } },
          400: { description: 'Name is required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/workspaces/invite': {
      post: {
        tags: ['Workspaces'],
        summary: 'Invite a user to workspace',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspace_id', 'username'],
                properties: {
                  workspace_id: { type: 'integer' },
                  username: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User invited', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
          403: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/workspaces/{id}': {
      delete: {
        tags: ['Workspaces'],
        summary: 'Delete a workspace (owner only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Workspace deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
          403: { description: 'Only owner can delete', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/workspaces/{id}/members': {
      get: {
        tags: ['Workspaces'],
        summary: 'Get workspace members',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Member list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WorkspaceMember' } } } } },
        },
      },
    },
    '/workspaces/{id}/leave': {
      delete: {
        tags: ['Workspaces'],
        summary: 'Leave a workspace',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Left workspace', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
        },
      },
    },
    '/workspaces/{id}/transfer-ownership': {
      post: {
        tags: ['Workspaces'],
        summary: 'Transfer workspace ownership',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Ownership transferred', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
        },
      },
    },
    '/workspaces/{id}/members/{userId}': {
      delete: {
        tags: ['Workspaces'],
        summary: 'Remove a member from workspace',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Member removed', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
        },
      },
    },
    '/workspaces/{id}/members/{userId}/role': {
      put: {
        tags: ['Workspaces'],
        summary: 'Change member role',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role changed', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
        },
      },
    },
  };
}

function customFieldApiPaths() {
  return {
    '/custom-fields': {
      get: {
        tags: ['Custom Fields'],
        summary: 'List custom fields',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Custom fields list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CustomField' } } } } },
        },
      },
      post: {
        tags: ['Custom Fields'],
        summary: 'Create a custom field',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['key', 'label'],
                properties: {
                  key: { type: 'string' },
                  label: { type: 'string' },
                  fa: { type: 'string' },
                  placeholder: { type: 'string' },
                  fieldType: { type: 'string', enum: ['text', 'number', 'select', 'date'] },
                  options: { type: 'array', items: { type: 'string' } },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Field created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomField' } } } },
          409: { description: 'Duplicate key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/custom-fields/batch': {
      post: {
        tags: ['Custom Fields'],
        summary: 'Batch save custom fields (replaces all for workspace)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fields'],
                properties: {
                  fields: { type: 'array', items: { $ref: '#/components/schemas/CustomField' } },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Fields saved', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, count: { type: 'integer' } } } } } },
        },
      },
    },
    '/custom-fields/{key}': {
      put: {
        tags: ['Custom Fields'],
        summary: 'Update a custom field',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  fa: { type: 'string' },
                  placeholder: { type: 'string' },
                  fieldType: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  workspace_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Field updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomField' } } } },
          404: { description: 'Field not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Custom Fields'],
        summary: 'Delete a custom field',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Field deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          404: { description: 'Field not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  };
}

app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/records', recordRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/custom-fields', customFieldRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);

app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/v1/ai', authMiddleware, aiRoutes);

app.get('/api/version', (req, res) => {
  res.json({ version: '2.1.0', apiVersions: ['v1'] });
});

const distPath = join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

runMigrations();

// Create backup on startup
try {
  const backupPath = createBackup('pre-start');
  if (backupPath) console.log(`Backup created: ${backupPath}`);
} catch (err) {
  console.warn('Backup creation failed:', err.message);
}

// Periodic WAL checkpoint every 5 minutes to prevent WAL growth
const CHECKPOINT_INTERVAL = 5 * 60 * 1000;
const checkpointTimer = setInterval(() => {
  try {
    performCheckpoint(getDbPath());
  } catch {
    // Non-critical
  }
}, CHECKPOINT_INTERVAL);

const ws = initWebSocket(server, allowedOrigins);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Label Studio API running on http://localhost:${PORT}`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    clearInterval(checkpointTimer);

    // Final checkpoint before shutdown
    try {
      performCheckpoint(getDbPath());
    } catch {}

    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
