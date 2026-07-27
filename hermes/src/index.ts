import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { streamChatResponse, fetchAvailableModels, type ProviderConfig } from './agent.js';
import { createChildLogger } from './logger.js';
import type { CoreMessage } from 'ai';

const log = createChildLogger('server');

const app = express();
const PORT = parseInt(process.env.HERMES_PORT || '3002', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hermes-agent', timestamp: new Date().toISOString() });
});

// Fetch models from a provider
app.post('/models', async (req, res) => {
  try {
    const { apiEndpoint, apiKey } = req.body;
    if (!apiEndpoint || !apiKey) {
      return res.status(400).json({ error: 'apiEndpoint and apiKey are required' });
    }
    const models = await fetchAvailableModels(apiEndpoint, apiKey);
    res.json({ models });
  } catch (err: any) {
    log.error({ error: err.message }, 'Error fetching models');
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Main chat endpoint — streams SSE
app.post('/chat', async (req, res) => {
  const startTime = Date.now();

  try {
    const { messages, config, conversationId } = req.body as {
      messages: CoreMessage[];
      config: ProviderConfig;
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required and must not be empty' });
    }

    if (!config?.apiEndpoint || !config?.model) {
      return res.status(400).json({ error: 'config.apiEndpoint and config.model are required' });
    }

    // API key is optional (some local providers don't need it)
    if (!config.apiKey) {
      config.apiKey = '';
    }

    log.info({
      messageCount: messages.length,
      model: config.model,
      endpoint: config.apiEndpoint,
      conversationId,
    }, 'Chat request received');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Collect tool calls/results via callbacks (non-blocking)
    const toolCallsList: Array<{ name: string; args: Record<string, unknown> }> = [];
    const toolResultsList: Array<{ toolCallId: string; result: unknown }> = [];

    const result = streamChatResponse({ messages, config, conversationId }, {
      onToolCall: (toolName, args) => {
        toolCallsList.push({ name: toolName, args });
        res.write(`data: ${JSON.stringify({ type: 'tool-call', toolName, args })}\n\n`);
      },
      onToolResult: (toolCallId, result) => {
        toolResultsList.push({ toolCallId, result });
        res.write(`data: ${JSON.stringify({ type: 'tool-result', toolCallId, result })}\n\n`);
      },
    });

    // Stream text deltas
    let deltaCount = 0;
    for await (const delta of result.textStream) {
      deltaCount++;
      res.write(`data: ${JSON.stringify({ type: 'text-delta', text: delta })}\n\n`);
    }
    log.info({ deltaCount }, 'Text stream iteration done');

    const elapsed = Date.now() - startTime;
    log.info({ elapsed, model: config.model }, 'Chat request completed');

    res.write(`data: ${JSON.stringify({ type: 'done', elapsed })}\n\n`);
    res.end();

  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    log.error({ error: err.message, elapsed }, 'Chat request failed');

    // If headers not sent yet, send error as JSON
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  log.info({ port: PORT }, 'Hermes agent server started');
});
