import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

/* Mock the API layer before importing the store — the store is a module
   singleton, so the mock must be in place at import time. */
vi.mock('../../utils/api', () => ({
  api: {
    aiChat: vi.fn(),
  },
  getAuthUser: () => null,
}));

import { api } from '../../utils/api';
import { chatStore } from '../chatStore';
import type { AISSEEvent } from '../../types';

const aiChatMock = api.aiChat as unknown as Mock;

/** Build a controllable async SSE stream. */
function makeStream(events: AISSEEvent[], delayMs = 0) {
  let consumed = false;

  async function* iterate() {
    if (consumed) return;
    consumed = true;
    for (const event of events) {
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));
      yield event;
    }
  }

  return {
    [Symbol.asyncIterator]() {
      return iterate();
    },
  };
}

describe('chatStore — conversation persistence & streaming lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatStore.__resetForTests();
  });

  it('keeps the conversation alive when the subscriber unsubscribes (route navigation)', async () => {
    const stream = makeStream([
      { type: 'text-delta', text: 'سلام ' },
      { type: 'text-delta', text: 'دنیا' },
      { type: 'done' },
    ], 30);
    aiChatMock.mockReturnValue(stream);

    const sessionId = chatStore.newSession();
    const unsubscribe = chatStore.subscribe(() => {}); // "component mounts"
    chatStore.sendMessage({ sessionId, text: 'سلام', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });
    unsubscribe(); // "component unmounts" — must NOT abort the stream

    await vi.waitFor(() => {
      expect(chatStore.getSnapshot().streamingSessionId).toBeNull();
    }, { timeout: 4000 });

    const session = chatStore.getSnapshot().sessions.find(s => s.id === sessionId);
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages[1].content).toBe('سلام دنیا');
    expect(session?.messages[1].status).toBe('completed');
  });

  it('persists messages to localStorage after completion', async () => {
    const stream = makeStream([{ type: 'text-delta', text: 'پاسخ' }, { type: 'done' }]);
    aiChatMock.mockReturnValue(stream);

    const sessionId = chatStore.newSession();
    chatStore.sendMessage({ sessionId, text: 'سوال', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });

    await vi.waitFor(() => expect(chatStore.getSnapshot().streamingSessionId).toBeNull());

    const raw = localStorage.getItem('hermes_chat_sessions');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    const saved = parsed.find((s: { id: string }) => s.id === sessionId);
    expect(saved.messages).toHaveLength(2);
    expect(saved.messages[1].content).toBe('پاسخ');
  });

  it('marks cancelled generations and keeps partial text', async () => {
    const events: AISSEEvent[] = [
      { type: 'text-delta', text: 'بخش اول ' },
      { type: 'text-delta', text: 'بخش دوم' },
    ];
    const stream = makeStream(events, 30);
    aiChatMock.mockReturnValue(stream);

    const sessionId = chatStore.newSession();
    chatStore.sendMessage({ sessionId, text: 'سوال', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });

    await vi.waitFor(() => expect(chatStore.getSnapshot().streamingText).not.toBe(''));
    chatStore.stop();

    await vi.waitFor(() => expect(chatStore.getSnapshot().streamingSessionId).toBeNull());
    const session = chatStore.getSnapshot().sessions.find(s => s.id === sessionId);
    const assistant = session?.messages.find(m => m.role === 'assistant');
    expect(assistant?.status).toBe('cancelled');
    expect((assistant?.content || '').length).toBeGreaterThan(0);
  });

  it('marks failed generations with the error', async () => {
    aiChatMock.mockImplementation(() => {
      async function* boom(): AsyncIterable<AISSEEvent> {
        yield { type: 'text-delta', text: 'شروع' };
        throw new Error('Hermes unreachable');
      }
      return boom();
    });

    const sessionId = chatStore.newSession();
    chatStore.sendMessage({ sessionId, text: 'سوال', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });

    await vi.waitFor(() => expect(chatStore.getSnapshot().streamingSessionId).toBeNull());
    const session = chatStore.getSnapshot().sessions.find(s => s.id === sessionId);
    const assistant = session?.messages.find(m => m.role === 'assistant');
    expect(assistant?.status).toBe('failed');
    expect(assistant?.error).toContain('Hermes');
  });

  it('collects artifact events into the final assistant message', async () => {
    const artifact = {
      id: 'a1', type: 'pdf', filename: 'report.pdf', mimeType: 'application/pdf',
      size: 1234, url: '/api/artifacts/a1', createdAt: new Date().toISOString(),
    };
    const stream = makeStream([
      { type: 'tool-call', toolName: 'generate_monthly_report', args: {} },
      { type: 'tool-result', toolCallId: 'generate_monthly_report', result: { success: true } },
      { type: 'artifact', artifact },
      { type: 'text-delta', text: 'گزارش آماده شد' },
      { type: 'done' },
    ]);
    aiChatMock.mockReturnValue(stream);

    const sessionId = chatStore.newSession();
    chatStore.sendMessage({ sessionId, text: 'گزارش بساز', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });

    await vi.waitFor(() => expect(chatStore.getSnapshot().streamingSessionId).toBeNull());
    const session = chatStore.getSnapshot().sessions.find(s => s.id === sessionId);
    const assistant = session?.messages.find(m => m.role === 'assistant');
    expect(assistant?.artifacts).toHaveLength(1);
    expect(assistant?.artifacts?.[0].url).toBe('/api/artifacts/a1');
    expect(assistant?.status).toBe('completed');
    // binary must never enter the message
    expect(JSON.stringify(assistant)).not.toContain('data_base64');
  });

  it('sanitize on load: a phantom streaming message becomes failed (browser reload)', async () => {
    // Simulate a reload mid-stream: a persisted message stuck in 'streaming'
    localStorage.setItem('hermes_chat_sessions', JSON.stringify([{
      id: 's1', title: 'قدیمی', messages: [
        { id: 'u1', role: 'user', content: 'سوال', timestamp: Date.now() },
        { id: 'a1', role: 'assistant', content: 'نیمهکاره', status: 'streaming', timestamp: Date.now() },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    }]));

    // Re-import to re-run module init
    vi.resetModules();
    const { chatStore: freshStore } = await import('../chatStore');
    const session = freshStore.getSnapshot().sessions.find(s => s.id === 's1');
    expect(session?.messages[1].status).toBe('failed');
    expect(session?.messages[1].error).toBeTruthy();
  });

  it('refuses a second stream while one is running', async () => {
    const stream = makeStream([{ type: 'text-delta', text: 'کند' }], 40);
    aiChatMock.mockReturnValue(stream);

    const sessionId = chatStore.newSession();
    chatStore.sendMessage({ sessionId, text: 'اول', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });
    chatStore.sendMessage({ sessionId, text: 'دوم', config: { apiEndpoint: 'https://x/v1/chat/completions', apiKey: 'k', model: 'm' } });

    await vi.waitFor(() => expect(chatStore.getSnapshot().streamingSessionId).toBeNull());
    const session = chatStore.getSnapshot().sessions.find(s => s.id === sessionId);
    expect(session?.messages.filter(m => m.role === 'user')).toHaveLength(1);
  });
});
