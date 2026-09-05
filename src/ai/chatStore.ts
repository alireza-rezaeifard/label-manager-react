import type { AIChatMessage, AIProviderConfig, AISSEEvent, ChatAttachment } from '../types';
import { api } from '../utils/api';

/* ══════════════════════════════════════════════════════════════════════
   chatStore — persistent AI conversation store.

   Owns sessions, messages and the STREAMING LIFECYCLE at module level,
   independent of any mounted component. Navigating away from the AI
   Workspace never aborts or erases an in-flight response; the stream
   keeps running and the UI re-subscribes on return.

   Persistence: localStorage (throttled during streaming).
   Browser-reload limitation (documented): an in-flight HTTP stream dies
   with the page — partial content is kept and its status is marked
   'failed' with an explicit reason on next load. No silent erasure.
   ══════════════════════════════════════════════════════════════════════ */

export type MessageStatus = 'streaming' | 'completed' | 'failed' | 'cancelled';

export interface ChatSession {
  id: string;
  title: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface RunningToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface ChatStoreState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  /** id of the session that has an in-flight stream (null = idle) */
  streamingSessionId: string | null;
  /** partial text of the in-flight assistant message */
  streamingText: string;
  /** tool calls of the in-flight response (with results as they arrive) */
  runningToolCalls: RunningToolCall[];
  /** artifacts produced by the in-flight response */
  runningArtifacts: import('../types').ArtifactMeta[];
  streamError: string | null;
  /** true after reload if a previous stream was cut by the browser */
  hydrated: boolean;
}

const SESSIONS_KEY = 'hermes_chat_sessions';
const ACTIVE_KEY = 'hermes_chat_active';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 35 ? cleaned.slice(0, 35) + '…' : cleaned;
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Sanitize: a stream cut by a page reload can never resume —
    // mark it honestly instead of leaving a phantom 'streaming'.
    for (const s of parsed) {
      for (const m of s.messages ?? []) {
        if (m.status === 'streaming') {
          m.status = 'failed';
          m.error = 'پاسخ به دلیل بستهشدن صفحه نیمهکاره ماند.';
        }
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

function persist(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch { /* quota — non-fatal */ }
}

/* ── module singleton state ── */
let sessions: ChatSession[] = typeof localStorage !== 'undefined' ? loadSessions() : [];
let activeSessionId: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_KEY) : null;
if (!activeSessionId || !sessions.some(s => s.id === activeSessionId)) {
  activeSessionId = sessions[0]?.id ?? null;
}

let state: ChatStoreState = {
  sessions,
  activeSessionId,
  streamingSessionId: null,
  streamingText: '',
  runningToolCalls: [],
  runningArtifacts: [],
  streamError: null,
  hydrated: true,
};

const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function commit(patch: Partial<ChatStoreState>, opts: { immediateSave?: boolean } = {}) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
  if (opts.immediateSave) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    persist(state.sessions);
  } else if (!saveTimer) {
    saveTimer = setTimeout(() => { saveTimer = null; persist(state.sessions); }, 400);
  }
}

function touchSession(sessionId: string, messages: AIChatMessage[]) {
  const updated = state.sessions.map(s =>
    s.id === sessionId ? { ...s, messages, updatedAt: Date.now() } : s
  );
  return updated;
}

/* ── stream controller ── */
let abortController: AbortController | null = null;

export interface SendMessageOptions {
  sessionId: string;
  text: string;
  attachments?: ChatAttachment[];
  config: AIProviderConfig;
  workspaceId?: number | string;
  workspaceName?: string;
}

async function runStream(opts: SendMessageOptions) {
  const { sessionId, text, attachments, config, workspaceId } = opts;
  const current = state.sessions.find(s => s.id === sessionId);
  if (!current) return;

  const userMsg: AIChatMessage = {
    id: createId('user'),
    role: 'user',
    content: text,
    attachments: attachments?.length ? attachments : undefined,
    timestamp: Date.now(),
  };
  const messages = [...current.messages, userMsg];

  const title = current.messages.length === 0 ? deriveTitle(text || 'فایل') : current.title;
  commit({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, messages, title, updatedAt: Date.now() } : s),
    streamingSessionId: sessionId,
    streamingText: '',
    runningToolCalls: [],
    runningArtifacts: [],
    streamError: null,
  }, { immediateSave: true });

  abortController = new AbortController();
  const signal = abortController.signal;

  let fullText = '';
  const toolCalls: RunningToolCall[] = [];
  let artifacts: import('../types').ArtifactMeta[] = [];
  let agentAttachments: ChatAttachment[] | undefined;

  const finalize = (status: MessageStatus, error?: string) => {
    const assistantMsg: AIChatMessage = {
      id: createId('assistant'),
      role: 'assistant',
      content: fullText,
      status,
      error,
      attachments: agentAttachments,
      artifacts: artifacts.length ? artifacts : undefined,
      toolCalls: toolCalls.length
        ? toolCalls.map(t => ({ toolName: t.name, args: t.args }))
        : undefined,
      timestamp: Date.now(),
    };
    const session = state.sessions.find(s => s.id === sessionId);
    const base = session ? session.messages : messages;
    const withPartialRemoved = base.filter(m => !(m.role === 'assistant' && m.status === 'streaming'));
    const next = status === 'failed' || status === 'cancelled' || assistantMsg.content || assistantMsg.artifacts
      ? [...withPartialRemoved, assistantMsg]
      : withPartialRemoved;
    abortController = null;
    commit({
      sessions: touchSession(sessionId, next),
      streamingSessionId: null,
      streamingText: '',
      runningToolCalls: [],
      runningArtifacts: [],
      streamError: error && status === 'failed' ? error : null,
    }, { immediateSave: true });
  };

  try {
    const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
    const stream = api.aiChat(apiMessages, config, sessionId, workspaceId);
    for await (const event of stream as AsyncIterable<AISSEEvent>) {
      if (signal.aborted) break;
      switch (event.type) {
        case 'text-delta':
          fullText += event.text || '';
          commit({ streamingText: fullText });
          break;
        case 'tool-call':
          if (event.toolName && event.args) {
            toolCalls.push({ name: event.toolName, args: event.args });
            commit({ runningToolCalls: [...toolCalls] });
          }
          break;
        case 'tool-result': {
          const tc = toolCalls.find(t => t.name === event.toolCallId);
          if (tc) tc.result = event.result;
          commit({ runningToolCalls: [...toolCalls] });
          break;
        }
        case 'artifact':
          if (event.artifact) {
            artifacts = [...artifacts, event.artifact];
            commit({ runningArtifacts: [...artifacts] });
          }
          break;
        case 'error':
          finalize('failed', event.error || 'خطای ناشناخته در پردازش پاسخ');
          return;
        default:
          if (event.attachments && event.attachments.length) {
            agentAttachments = [...(agentAttachments || []), ...event.attachments];
          }
          break;
      }
    }
    if (signal.aborted) {
      finalize('cancelled');
    } else if (!fullText.trim() && artifacts.length === 0 && toolCalls.length === 0) {
      // Empty stream (e.g. provider failed silently) — show an honest error
      // instead of silently dropping the assistant message.
      finalize('failed', 'پاسخی از دستیار دریافت نشد. تنظیمات مدل (آدرس API، کلید و نام مدل) را بررسی کنید.');
    } else {
      finalize('completed');
    }
  } catch (err: unknown) {
    if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      finalize('cancelled');
      return;
    }
    finalize('failed', err instanceof Error ? err.message : 'ارسال درخواست ناموفق بود');
  }
}

/* ── public API ── */
export const chatStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  getSnapshot(): ChatStoreState {
    return state;
  },

  isBusy(): boolean {
    return state.streamingSessionId !== null;
  },

  ensureSession(): string {
    if (state.activeSessionId && state.sessions.some(s => s.id === state.activeSessionId)) {
      return state.activeSessionId;
    }
    const session: ChatSession = {
      id: createId('session'),
      title: 'گفتگوی جدید',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    activeSessionId = session.id;
    commit({ sessions: [session, ...state.sessions], activeSessionId: session.id }, { immediateSave: true });
    try { localStorage.setItem(ACTIVE_KEY, session.id); } catch { /* ignore */ }
    return session.id;
  },

  switchSession(id: string) {
    if (!state.sessions.some(s => s.id === id)) return;
    // NOTE: switching does NOT abort an in-flight stream — it keeps running.
    activeSessionId = id;
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ }
    commit({ activeSessionId: id });
  },

  newSession(): string {
    const session: ChatSession = {
      id: createId('session'),
      title: 'گفتگوی جدید',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    activeSessionId = session.id;
    try { localStorage.setItem(ACTIVE_KEY, session.id); } catch { /* ignore */ }
    commit({ sessions: [session, ...state.sessions], activeSessionId: session.id }, { immediateSave: true });
    return session.id;
  },

  deleteSession(id: string) {
    if (state.sessions.length <= 1) return;
    const updated = state.sessions.filter(s => s.id !== id);
    let nextActive = state.activeSessionId;
    if (id === state.activeSessionId) {
      nextActive = updated[0]?.id ?? null;
      activeSessionId = nextActive;
      try { if (nextActive) localStorage.setItem(ACTIVE_KEY, nextActive); } catch { /* ignore */ }
    }
    commit({ sessions: updated, activeSessionId: nextActive }, { immediateSave: true });
  },

  togglePin(id: string) {
    const updated = state.sessions.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s);
    commit({ sessions: updated }, { immediateSave: true });
  },

  /** Send a user message. Streaming continues even if the UI unmounts. */
  sendMessage(opts: SendMessageOptions) {
    if (state.streamingSessionId) return; // one stream at a time
    void runStream(opts);
  },

  /** Stop the in-flight generation. Partial content is kept, status 'cancelled'. */
  stop() {
    abortController?.abort();
  },

  /** Test-only: reset all state. */
  __resetForTests() {
    abortController = null;
    sessions = [];
    activeSessionId = null;
    try { localStorage.removeItem(SESSIONS_KEY); localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
    commit({
      sessions: [],
      activeSessionId: null,
      streamingSessionId: null,
      streamingText: '',
      runningToolCalls: [],
      runningArtifacts: [],
      streamError: null,
    }, { immediateSave: true });
  },
};
