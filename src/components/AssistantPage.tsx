import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import {
  ArrowUp, Square, Settings, Plus, MessageSquare, Search,
  X, Trash2, PanelLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { api } from '../utils/api';
import type { AIChatMessage, AIProviderConfig, AISSEEvent, ChatAttachment } from '../types';
import { SparklesIcon } from './ai-chatbot/icons';
import { Messages } from './ai-chatbot/messages';
import { MultimodalInput } from './ai-chatbot/multimodal-input';
import './ai-chatbot/chat.css';

// ── Session types ──
interface ChatSession {
  id: string;
  title: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ── Reducer ──
interface State {
  messages: AIChatMessage[];
  streaming: boolean;
  streamingText: string;
  currentToolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
  error: string | null;
  aborted: boolean;
}

type Action =
  | { type: 'ADD_MESSAGE'; message: AIChatMessage }
  | { type: 'SET_MESSAGES'; messages: AIChatMessage[] }
  | { type: 'SET_STREAMING'; value: boolean }
  | { type: 'APPEND_TEXT'; text: string }
  | { type: 'CLEAR_STREAMING_TEXT' }
  | { type: 'CLEAR_TOOL_CALLS' }
  | { type: 'ADD_TOOL_CALL'; name: string; args: Record<string, unknown> }
  | { type: 'ADD_TOOL_RESULT'; toolCallId: string; result: unknown }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_ABORTED'; value: boolean }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
    case 'SET_STREAMING':
      return { ...state, streaming: action.value };
    case 'APPEND_TEXT':
      return { ...state, streamingText: state.streamingText + action.text };
    case 'CLEAR_STREAMING_TEXT':
      return { ...state, streamingText: '' };
    case 'CLEAR_TOOL_CALLS':
      return { ...state, currentToolCalls: [] };
    case 'ADD_TOOL_CALL':
      return {
        ...state,
        currentToolCalls: [...state.currentToolCalls, { name: action.name, args: action.args }],
      };
    case 'ADD_TOOL_RESULT':
      return {
        ...state,
        currentToolCalls: state.currentToolCalls.map(tc =>
          tc.name === action.toolCallId ? { ...tc, result: action.result } : tc
        ),
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_ABORTED':
      return { ...state, aborted: action.value };
    case 'CLEAR':
      return { messages: [], streaming: false, streamingText: '', currentToolCalls: [], error: null, aborted: false };
    default:
      return state;
  }
}

// ── Session helpers ──
const SESSIONS_KEY = 'hermes_sessions';
const ACTIVE_SESSION_KEY = 'hermes_active_session';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function setActiveSessionId(id: string) {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

function createNewSession(): ChatSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New conversation',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function deriveTitle(msg: string): string {
  const cleaned = msg.replace(/\s+/g, ' ').trim();
  return cleaned.length > 35 ? cleaned.slice(0, 35) + '...' : cleaned;
}

// ── Config ──
const INITIAL_CONFIG: AIProviderConfig = {
  apiEndpoint: localStorage.getItem('ai_api_endpoint') || '',
  apiKey: localStorage.getItem('ai_api_key') || '',
  model: localStorage.getItem('ai_model') || '',
  providerName: localStorage.getItem('ai_provider_name') || '',
};

// ── Main Component ──
export default function AssistantPage() {
  // ── Sessions ──
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loaded = loadSessions();
    if (loaded.length === 0) {
      const s = createNewSession();
      saveSessions([s]);
      setActiveSessionId(s.id);
      return [s];
    }
    return loaded;
  });
  const [activeSessionId, setActiveSessionIdState] = useState<string>(() => {
    const id = getActiveSessionId();
    if (id && sessions.find(s => s.id === id)) return id;
    setActiveSessionId(sessions[0].id);
    return sessions[0].id;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // ── Chat ──
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const [state, dispatch] = useReducer(reducer, {
    messages: activeSession?.messages || [],
    streaming: false,
    streamingText: '',
    currentToolCalls: [],
    error: null,
    aborted: false,
  });

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [config, setConfig] = useState<AIProviderConfig>(INITIAL_CONFIG);
  const [showConfig, setShowConfig] = useState(!config.apiEndpoint);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // ── Auto-scroll ──
  const handleScroll = useCallback(() => {
    const el = document.querySelector('.ai-chat-messages-scroll');
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distFromBottom < 120);
  }, []);

  // ── Persist ──
  // Derive persisted sessions at render time when messages change (avoids
  // setState-in-effect cascading renders).
  const [prevPersistKey, setPrevPersistKey] = useState('');
  const persistKey = `${activeSessionId}|${state.messages.length}|${state.messages.length > 0 ? state.messages[state.messages.length - 1].id : ''}`;
  if (activeSessionId && persistKey !== prevPersistKey) {
    setPrevPersistKey(persistKey);
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: state.messages, updatedAt: Date.now() }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }

  // ── Cleanup ──
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── Session management ──
  const switchSession = useCallback((id: string) => {
    const target = sessions.find(s => s.id === id);
    if (!target) return;
    abortRef.current?.abort();
    setActiveSessionIdState(id);
    setActiveSessionId(id);
    dispatch({ type: 'SET_MESSAGES', messages: target.messages });
    dispatch({ type: 'CLEAR_STREAMING_TEXT' });
    dispatch({ type: 'CLEAR_TOOL_CALLS' });
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_ABORTED', value: false });
    setSidebarOpen(false);
  }, [sessions]);

  const handleNewSession = () => {
    const s = createNewSession();
    const updated = [s, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    switchSession(s.id);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (id === activeSessionId) switchSession(updated[0].id);
  };

  const handleRenameSession = (id: string) => {
    if (!editTitle.trim()) { setEditingSessionId(null); return; }
    const updated = sessions.map(s => s.id === id ? { ...s, title: editTitle.trim() } : s);
    setSessions(updated);
    saveSessions(updated);
    setEditingSessionId(null);
  };

  // ── Config ──
  const saveConfig = (c: AIProviderConfig) => {
    setConfig(c);
    localStorage.setItem('ai_api_endpoint', c.apiEndpoint);
    localStorage.setItem('ai_api_key', c.apiKey);
    localStorage.setItem('ai_model', c.model);
    localStorage.setItem('ai_provider_name', c.providerName || '');
  };

  const fetchModels = async () => {
    if (!config.apiEndpoint || !config.apiKey) return;
    setFetchingModels(true);
    try {
      const res = await api.fetchAIModels(config.apiEndpoint, config.apiKey);
      const data = res as Record<string, unknown>;
      const models = Array.isArray(data.models) ? data.models as string[] : [];
      setAvailableModels(models);
    } catch {
      setAvailableModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  // ── Send / Stop ──
  const handleStop = () => {
    abortRef.current?.abort();
    dispatch({ type: 'SET_STREAMING', value: false });
    dispatch({ type: 'SET_ABORTED', value: true });
  };

  // Attachments — user can send files; agent responses may carry them too
  const handleAttachFiles = useCallback((files: File[]) => {
    setAttachments(prev => [
      ...prev,
      ...files.map(f => ({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        type: f.type,
        size: f.size,
        url: URL.createObjectURL(f),
      })),
    ]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || state.streaming || !config.apiEndpoint || !config.model) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      attachments: attachments.length ? attachments : undefined,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    setInput('');
    setAttachments([]);
    dispatch({ type: 'SET_STREAMING', value: true });
    dispatch({ type: 'CLEAR_STREAMING_TEXT' });
    dispatch({ type: 'CLEAR_TOOL_CALLS' });
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_ABORTED', value: false });

    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && currentSession.messages.length === 0) {
      const newTitle = deriveTitle(text);
      const updated = sessions.map(s =>
        s.id === activeSessionId ? { ...s, title: newTitle } : s
      );
      setSessions(updated);
      saveSessions(updated);
    }

    const apiMessages = [...state.messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const stream = api.aiChat(apiMessages, config);
      let fullText = '';
      let agentAttachments: ChatAttachment[] | undefined;
      const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

      for await (const event of stream as AsyncIterable<AISSEEvent>) {
        if (abortRef.current?.signal.aborted) break;
        switch (event.type) {
          case 'text-delta':
            fullText += event.text || '';
            dispatch({ type: 'APPEND_TEXT', text: event.text || '' });
            break;
          case 'tool-call':
            if (event.toolName && event.args) {
              toolCalls.push({ name: event.toolName, args: event.args });
              dispatch({ type: 'ADD_TOOL_CALL', name: event.toolName, args: event.args });
            }
            break;
          case 'tool-result':
            dispatch({ type: 'ADD_TOOL_RESULT', toolCallId: event.toolCallId || '', result: event.result });
            break;
          case 'error':
            dispatch({ type: 'SET_ERROR', error: event.error || 'Unknown error' });
            break;
          case 'done':
            if (event.attachments && event.attachments.length) agentAttachments = event.attachments;
            break;
        }
      }

      if (!abortRef.current?.signal.aborted && fullText) {
        const assistantMsg: AIChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullText,
          attachments: agentAttachments,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: Date.now(),
        };
        dispatch({ type: 'ADD_MESSAGE', message: assistantMsg });
      }
      dispatch({ type: 'SET_STREAMING', value: false });
      dispatch({ type: 'CLEAR_STREAMING_TEXT' });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Request failed';
      dispatch({ type: 'SET_ERROR', error: msg });
      dispatch({ type: 'SET_STREAMING', value: false });
    }
  };

  // ── Render ──
  return (
    <div className="ai-chat">
      {/* ── Sidebar Backdrop ── */}
      {sidebarOpen && (
        <div className="ai-chat-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`ai-chat-sidebar ${sidebarOpen ? 'ai-chat-sidebar-open' : ''}`}>
        <div className="ai-chat-sidebar-header">
          <button onClick={handleNewSession} className="ai-chat-sidebar-btn-new" type="button" aria-label="New conversation">
            <Plus size={15} />
            <span>New</span>
          </button>
        </div>
        <div className="ai-chat-sidebar-search">
          <Search size={14} />
          <input placeholder="Search..." className="ai-chat-sidebar-search-input" />
        </div>
        <div className="ai-chat-sidebar-list">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => switchSession(s.id)}
              className={`ai-chat-sidebar-item ${s.id === activeSessionId ? 'ai-chat-sidebar-item-active' : ''}`}
            >
              <MessageSquare size={14} className="ai-chat-sidebar-item-icon" />
              {editingSessionId === s.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameSession(s.id);
                    if (e.key === 'Escape') setEditingSessionId(null);
                  }}
                  onBlur={() => handleRenameSession(s.id)}
                  onClick={e => e.stopPropagation()}
                  className="ai-chat-sidebar-edit-input"
                />
              ) : (
                <span
                  className="ai-chat-sidebar-item-label"
                  onDoubleClick={e => {
                    e.stopPropagation();
                    setEditingSessionId(s.id);
                    setEditTitle(s.title);
                  }}
                >
                  {s.title}
                </span>
              )}
              {sessions.length > 1 && editingSessionId !== s.id && (
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteSession(s.id); }}
                  className="ai-chat-sidebar-item-delete"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ai-chat-main">
        {/* Header */}
        <header className="ai-chat-header">
          <div className="ai-chat-header-left">
            <button onClick={() => setSidebarOpen(o => !o)} className="ai-chat-header-btn" type="button" aria-label="Toggle sidebar">
              <PanelLeft size={16} />
            </button>
          </div>
          <div className="ai-chat-header-center">
            <div className="ai-chat-header-brand">
              <SparklesIcon size={14} className="ai-chat-header-brand-icon" />
              <span className="ai-chat-header-brand-text">Hermes</span>
            </div>
          </div>
          <div className="ai-chat-header-right">
            <button onClick={() => setShowConfig(true)} className="ai-chat-header-btn" type="button" title="Settings" aria-label="Settings">
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <Messages
          messages={state.messages}
          streaming={state.streaming}
          streamingText={state.streamingText}
          toolCalls={state.currentToolCalls}
          isAtBottom={isAtBottom}
          onScroll={handleScroll}
        />

        {/* Error */}
        {state.error && (
          <div className="ai-chat-error" style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', maxWidth: 600, zIndex: 20 }}>
            <span>{state.error}</span>
            <button onClick={() => dispatch({ type: 'SET_ERROR', error: null })} className="ai-chat-error-dismiss" type="button">
              Dismiss
            </button>
          </div>
        )}

        {/* Composer */}
        <div style={{ borderTop: '1px solid var(--border-color, #eaeaea)', background: 'var(--card-bg, #ffffff)', flexShrink: 0, position: 'relative', zIndex: 20 }}>
          <MultimodalInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={state.streaming}
            disabled={!config.apiEndpoint || !config.model}
            placeholder={!config.apiEndpoint ? 'Set up AI provider first...' : 'Ask anything...'}
            messagesEmpty={state.messages.length === 0}
            attachments={attachments}
            onAttachFiles={handleAttachFiles}
            onRemoveAttachment={handleRemoveAttachment}
          />
        </div>
      </div>

      {/* ── Config Modal ── */}
      {showConfig && (
        <div className="ai-chat-modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="ai-chat-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-chat-modal-header">
              <div className="ai-chat-modal-header-left">
                <Settings size={17} className="ai-chat-modal-header-icon" />
                <h3 className="ai-chat-modal-title">AI Settings</h3>
              </div>
              <button onClick={() => setShowConfig(false)} className="ai-chat-modal-close" type="button" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="ai-chat-modal-body">
              <div>
                <label className="ai-chat-field-label">API Endpoint</label>
                <input
                  type="url"
                  value={config.apiEndpoint}
                  onChange={e => saveConfig({ ...config, apiEndpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  dir="ltr"
                  className="ai-chat-field-input"
                />
              </div>
              <div>
                <label className="ai-chat-field-label">API Key</label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={e => saveConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                  dir="ltr"
                  className="ai-chat-field-input"
                />
              </div>
              <div>
                <label className="ai-chat-field-label">Model</label>
                <div className="ai-chat-field-row">
                  <input
                    type="text"
                    value={config.model}
                    onChange={e => saveConfig({ ...config, model: e.target.value })}
                    placeholder="gpt-4o / deepseek-chat / ..."
                    dir="ltr"
                    list="hermes-models-list"
                    className="ai-chat-field-input ai-chat-field-input-flex"
                  />
                  <datalist id="hermes-models-list">
                    {availableModels.map(m => <option key={m} value={m} />)}
                  </datalist>
                  <button onClick={fetchModels} disabled={fetchingModels} className="ai-chat-field-btn" type="button" title="Fetch models" aria-label="Fetch models">
                    {fetchingModels ? <Loader2 size={14} className="ai-chat-fetch-spinner" /> : <ChevronRight size={14} />}
                  </button>
                </div>
                {availableModels.length > 0 && (
                  <span className="ai-chat-field-hint">{availableModels.length} models available</span>
                )}
              </div>
              <div>
                <label className="ai-chat-field-label">Provider name (optional)</label>
                <input
                  type="text"
                  value={config.providerName || ''}
                  onChange={e => saveConfig({ ...config, providerName: e.target.value })}
                  placeholder="openai / openrouter / custom"
                  dir="ltr"
                  className="ai-chat-field-input"
                />
              </div>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              disabled={!config.apiEndpoint || !config.model}
              className="ai-chat-modal-submit"
              type="button"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
