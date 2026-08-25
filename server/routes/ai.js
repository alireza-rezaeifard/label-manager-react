import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import pino from 'pino';
import db from '../db.js';

const router = Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const HERMES_URL = process.env.HERMES_URL || 'http://hermes:3002';
const ARTIFACT_ROOT = path.join(process.cwd(), 'uploads', 'ai-artifacts');
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024; // 25 MB safety ceiling
const MAX_PROMPT_LENGTH = 15000;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

// Simple in-memory rate limiter per user
const rateLimitMap = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Validate message structure
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array';
  }
  for (const msg of messages) {
    if (!msg.role || !['user', 'assistant', 'system', 'tool'].includes(msg.role)) {
      return 'Each message must have a valid role (user, assistant, system, tool)';
    }
    if (msg.content && typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
      return 'Message content must be a string or array';
    }
    if (typeof msg.content === 'string' && msg.content.length > MAX_PROMPT_LENGTH) {
      return `Message content exceeds max length of ${MAX_PROMPT_LENGTH}`;
    }
  }
  return null;
}

// Validate provider config
function validateConfig(config) {
  if (!config) return 'config is required';
  if (!config.apiEndpoint || typeof config.apiEndpoint !== 'string') {
    return 'config.apiEndpoint is required';
  }
  if (!config.model || typeof config.model !== 'string') {
    return 'config.model is required';
  }
  // Validate URL format
  try {
    new URL(config.apiEndpoint);
  } catch {
    return 'config.apiEndpoint must be a valid URL';
  }
  return null;
}

// Sanitize config — strip unexpected fields
function sanitizeConfig(config) {
  return {
    apiEndpoint: String(config.apiEndpoint).trim(),
    apiKey: config.apiKey ? String(config.apiKey).trim() : '',
    model: String(config.model).trim(),
    providerName: config.providerName ? String(config.providerName).trim() : undefined,
  };
}

/**
 * Validate that the requester is a member of the requested workspace.
 * The workspaceId travels to Hermes for data scoping; artifacts are always
 * tagged with server-side values, never client claims.
 */
function validateWorkspaceAccess(workspaceId, userId) {
  if (workspaceId === undefined || workspaceId === null || workspaceId === '') {
    return { workspaceId: null };
  }
  const id = Number(workspaceId);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'Invalid workspaceId' };
  }
  const exists = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(id);
  if (!exists) return { error: 'Workspace not found' };
  const membership = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(id, userId);
  if (!membership) return { error: 'شما عضو این فضای کاری نیستید' };
  return { workspaceId: id };
}

/**
 * Persist an artifact emitted by Hermes (base64 payload) into workspace-
 * scoped storage, record it in ai_artifacts, and return client metadata.
 * Binary never reaches the chat message — only this metadata does.
 */
function storeArtifact(base64Data, meta, workspaceId, userId) {
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0) throw new Error('Empty artifact payload');
  if (buffer.length > MAX_ARTIFACT_BYTES) throw new Error('Artifact exceeds size limit');

  const safeName = path.basename(String(meta.filename || 'artifact')).replace(/[^\w.\-\u0600-\u06FF ]/g, '_') || 'artifact';
  const publicId = crypto.randomUUID();
  const dir = path.join(ARTIFACT_ROOT, String(workspaceId));
  fs.mkdirSync(dir, { recursive: true });
  const storagePath = path.join(dir, `${publicId}${path.extname(safeName) || ''}`);
  fs.writeFileSync(storagePath, buffer);

  db.prepare(
    `INSERT INTO ai_artifacts (public_id, workspace_id, user_id, filename, mime_type, size, storage_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(publicId, workspaceId, userId, safeName, String(meta.mime_type || 'application/octet-stream'), buffer.length, storagePath);

  logger.info({ publicId, workspaceId, size: buffer.length, filename: safeName }, 'Artifact stored');
  return {
    id: publicId,
    type: inferArtifactType(safeName, meta.mime_type),
    filename: safeName,
    mimeType: String(meta.mime_type || 'application/octet-stream'),
    size: buffer.length,
    url: `/api/artifacts/${publicId}`,
    createdAt: new Date().toISOString(),
  };
}

function inferArtifactType(filename, mime) {
  const ext = path.extname(filename).replace('.', '').toLowerCase();
  if (['pdf', 'csv', 'xlsx', 'json', 'txt', 'md'].includes(ext)) return ext;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/csv') return 'csv';
  return 'file';
}

/**
 * SSE stream transformer: forwards Hermes events verbatim except
 * `artifact` events, whose base64 payload is swapped for stored metadata.
 */
function createArtifactInterceptingWriter(res, workspaceId, userId) {
  let buffer = '';

  async function writeRaw(chunk) {
    if (!res.write(chunk)) {
      await new Promise(resolve => res.once('drain', resolve));
    }
    if (typeof res.flush === 'function') res.flush();
  }

  async function processEvent(eventJson) {
    let event;
    try {
      event = JSON.parse(eventJson);
    } catch {
      await writeRaw(`data: ${eventJson}\n\n`);
      return;
    }

    if (event.type === 'artifact' && event.data_base64) {
      try {
        const artifactMeta = storeArtifact(event.data_base64, event, workspaceId, userId);
        const { data_base64, ...safeEvent } = event;
        await writeRaw(`data: ${JSON.stringify({ ...safeEvent, artifact: artifactMeta })}\n\n`);
      } catch (err) {
        logger.error({ error: err.message, filename: event.filename }, 'Artifact storage failed');
        await writeRaw(`data: ${JSON.stringify({
          type: 'artifact-error',
          error: 'گزارش آماده شد، اما ذخیره فایل با خطا مواجه شد.',
          detail: err.message,
          filename: event.filename || null,
        })}\n\n`);
      }
      return;
    }

    await writeRaw(`data: ${eventJson}\n\n`);
  }

  return {
    async push(chunkText) {
      buffer += chunkText;
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('data: ')) {
            await processEvent(line.slice(6));
          }
        }
      }
    },
    async flush() {
      const rest = buffer.trim();
      buffer = '';
      if (rest.startsWith('data: ')) {
        await processEvent(rest.slice(6));
      }
    },
  };
}

// POST /api/ai/chat — Stream chat response from Hermes
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.id || 'anonymous';

  // Rate limit
  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.', code: 'RATE_LIMIT' });
  }

  try {
    const { messages, config, conversationId, workspaceId } = req.body;

    // Validate messages
    const msgError = validateMessages(messages);
    if (msgError) return res.status(400).json({ error: msgError, code: 'VALIDATION_ERROR' });

    // Validate config
    const configError = validateConfig(config);
    if (configError) return res.status(400).json({ error: configError, code: 'VALIDATION_ERROR' });

    // Validate workspace access (required for artifact/report generation)
    const wsCheck = validateWorkspaceAccess(workspaceId, req.user?.id);
    if (wsCheck.error) {
      return res.status(403).json({ error: wsCheck.error, code: 'WORKSPACE_ACCESS_DENIED' });
    }

    const sanitizedConfig = sanitizeConfig(config);

    // Forward to Hermes (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let hermesRes;
    try {
      hermesRes = await fetch(`${HERMES_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          config: sanitizedConfig,
          conversationId,
          workspaceId: wsCheck.workspaceId,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr.name === 'AbortError';
      logger.error({ error: fetchErr.message, hermesUrl: HERMES_URL }, 'Hermes fetch failed');
      return res.status(502).json({
        error: isAbort
          ? 'Hermes agent timed out. Try again later.'
          : 'Hermes agent is unreachable. Check service status.',
        code: isAbort ? 'HERMES_TIMEOUT' : 'HERMES_UNREACHABLE',
      });
    }
    clearTimeout(timeoutId);

    if (!hermesRes.ok) {
      let errBody;
      try { errBody = await hermesRes.json(); } catch { errBody = { error: 'Hermes error' }; }
      logger.error({ status: hermesRes.status, error: errBody.error }, 'Hermes returned error');
      return res.status(hermesRes.status).json({
        error: errBody.error || 'Hermes agent error',
        code: 'HERMES_ERROR',
      });
    }

    // Stream the SSE response back to the client, intercepting artifacts
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (!hermesRes.body) {
      logger.error('Hermes response body is null');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Hermes returned an empty response' })}\n\n`);
      res.end();
      return;
    }

    const writer = createArtifactInterceptingWriter(res, wsCheck.workspaceId ?? 0, req.user?.id);
    const reader = hermesRes.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.push(decoder.decode(value, { stream: true }));
      }
      await writer.flush();
    } catch (streamErr) {
      logger.error({ error: streamErr.message }, 'Stream error');
    }

    const elapsed = Date.now() - startTime;
    logger.info({
      userId,
      messageCount: messages.length,
      model: sanitizedConfig.model,
      elapsed,
    }, 'AI chat request completed');

    res.end();

  } catch (err) {
    const elapsed = Date.now() - startTime;
    logger.error({ error: err.message, stack: err.stack, userId, elapsed }, 'AI chat request failed');

    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error', code: 'INTERNAL_ERROR' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Internal server error' })}\n\n`);
      res.end();
    }
  }
});

// POST /api/ai/models — Fetch available models from a provider
router.post('/models', async (req, res) => {
  try {
    const { apiEndpoint, apiKey } = req.body;

    if (!apiEndpoint || !apiKey) {
      return res.status(400).json({ error: 'apiEndpoint and apiKey are required' });
    }

    // Validate URL
    try { new URL(apiEndpoint); } catch {
      return res.status(400).json({ error: 'Invalid apiEndpoint URL' });
    }

    const hermesRes = await fetch(`${HERMES_URL}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiEndpoint, apiKey }),
    });

    if (!hermesRes.ok) {
      return res.status(hermesRes.status).json({ error: 'Failed to fetch models' });
    }

    const data = await hermesRes.json();
    res.json(data);

  } catch (err) {
    logger.error({ error: err.message }, 'Models fetch failed');
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// GET /api/ai/health — Check Hermes health
router.get('/health', async (_req, res) => {
  try {
    const hermesRes = await fetch(`${HERMES_URL}/health`);
    const data = await hermesRes.json();
    res.json(data);
  } catch {
    res.status(503).json({ status: 'unavailable', service: 'hermes-agent' });
  }
});

export default router;
