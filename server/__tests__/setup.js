import { unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.DB_PATH = join(__dirname, '..', 'test-data.db');
process.env.JWT_SECRET = 'test-secret-key';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';

try { unlinkSync(process.env.DB_PATH); } catch {}
try { unlinkSync(process.env.DB_PATH + '-wal'); } catch {}
try { unlinkSync(process.env.DB_PATH + '-shm'); } catch {}
