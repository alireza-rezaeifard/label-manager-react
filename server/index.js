import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { runMigrations } from './migrate.js';
import { initWebSocket } from './ws.js';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';
import workspaceRoutes from './routes/workspaces.js';
import customFieldRoutes from './routes/custom-fields.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', authMiddleware, express.static(uploadsDir));

app.post('/api/upload-image', authMiddleware, (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image data', code: 'MISSING_IMAGE' });

  const maxSize = 5 * 1024 * 1024;
  if (Buffer.byteLength(image, 'utf8') > maxSize) {
    return res.status(400).json({ error: 'Image too large (max 5MB)', code: 'IMAGE_TOO_LARGE' });
  }

  const matches = image.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: 'Invalid image format. Allowed: png, jpg, jpeg, gif, webp', code: 'INVALID_IMAGE' });

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = Buffer.from(matches[2], 'base64');
  const filename = `${Date.now()}_${req.user.id}.${ext}`;
  const filepath = join(uploadsDir, filename);

  fs.writeFileSync(filepath, data);
  res.json({ url: `/uploads/${filename}` });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/custom-fields', customFieldRoutes);

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

const ws = initWebSocket(server, allowedOrigins);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Label Studio API running on http://localhost:${PORT}`);
  });
}

export default app;
