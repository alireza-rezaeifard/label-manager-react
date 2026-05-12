import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload-image', authMiddleware, (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image data' });

  const matches = image.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: 'Invalid image format' });

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = Buffer.from(matches[2], 'base64');
  const filename = `${Date.now()}_${req.user.id}.${ext}`;
  const filepath = join(uploadsDir, filename);

  fs.writeFileSync(filepath, data);
  res.json({ url: `/uploads/${filename}` });
});

app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Label Studio API running on http://localhost:${PORT}`);
});
