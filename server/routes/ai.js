import { Router } from 'express';
import pino from 'pino';

const router = Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const HERMES_URL = process.env.HERMES_URL || 'http://hermes:3002';
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

// POST /api/ai/chat — Stream chat response from Hermes
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.id || 'anonymous';

  // Rate limit
  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.', code: 'RATE_LIMIT' });
  }

  try {
    const { messages, config, conversationId } = req.body;

    // Validate messages
    const msgError = validateMessages(messages);
    if (msgError) return res.status(400).json({ error: msgError, code: 'VALIDATION_ERROR' });

    // Validate config
    const configError = validateConfig(config);
    if (configError) return res.status(400).json({ error: configError, code: 'VALIDATION_ERROR' });

    const sanitizedConfig = sanitizeConfig(config);

    // Forward to Hermes (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let hermesRes;
    try {
      hermesRes = await fetch(`${HERMES_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, config: sanitizedConfig, conversationId }),
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
    } finally {
      clearTimeout(timeoutId);
    }

    if (!hermesRes.ok) {
      let errBody;
      try { errBody = await hermesRes.json(); } catch { errBody = { error: 'Hermes error' }; }
      logger.error({ status: hermesRes.status, error: errBody.error }, 'Hermes returned error');
      return res.status(hermesRes.status).json({
        error: errBody.error || 'Hermes agent error',
        code: 'HERMES_ERROR',
      });
    }

    // Stream the SSE response back to the client
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

    const reader = hermesRes.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
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
