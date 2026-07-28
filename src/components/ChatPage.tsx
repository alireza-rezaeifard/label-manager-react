import { useState, useRef, useEffect, useCallback, useReducer, memo } from 'react';
import {
  Message, MessageContent, MessageResponse, MessageActions, CopyAction,
  Tool, ToolHeader, ToolContent, ToolInput, ToolOutput,
  Greeting, SuggestedActions, PromptInput, ThinkingMessage, ScrollToBottom,
  SparklesIcon,
} from './chatbot';
import { api } from '../utils/api';
import type { AIChatMessage, AIProviderConfig, AISSEEvent } from '../types';
import {
  PanelLeft, Plus, MessageSquare, X, Trash2, Search, Settings,
  Loader2, Square,
} from 'lucide-react';
import './chatbot/chatbot.css';

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
const SESSIONS_KEY = 'hermes_chat_sessions';
const ACTIVE_SESSION_KEY = 'hermes_chat_active';

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

// ── Tool Card ──
const ToolCard = memo(function ToolCard({ tc }: { tc: { name: string; args: Record<string, unknown>; result?: unknown } }) {
  const [expanded, setExpanded] = useState(false);
  const argsStr = JSON.stringify(tc.args, null, 2);
  const resultStr = tc.result !== undefined
    ? (typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)).slice(0, 500)
    : null;
  const hasResult = resultStr !== null;

  return (
    <Tool defaultOpen={expanded}>
      <div onClick={() => setExpanded(o => !o)} style={{ cursor: 'pointer' }}>
        <ToolHeader
          type={`tool-${tc.name}`}
          state={hasResult ? 'output-available' : 'input-streaming'}
          toolName={tc.name}
        />
      </div>
      {expanded && (
        <ToolContent>
          <ToolInput input={tc.args} />
          {hasResult && <ToolOutput output={<pre className="tool-code">{resultStr}</pre>} />}
        </ToolContent>
      )}
    </Tool>
  );
});

// ── Preview Message ──
const PreviewMessage = memo(function PreviewMessage({ msg }: { msg: AIChatMessage }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <Message from="user">
        <MessageContent>
          <div style={{
            display: 'inline-block', padding: '10px 14px', borderRadius: '18px 18px 4px 18px',
            background: 'var(--text-color, #171717)', color: 'var(--card-bg, #ffffff)',
            fontSize: 14, lineHeight: 1.6, maxWidth: '80%', wordBreak: 'break-word',
          }}>
            {msg.content}
          </div>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>{msg.content}</MessageResponse>
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="message-tools">
            {msg.toolCalls.map((tc, i) => <ToolCard key={i} tc={tc} />)}
          </div>
        )}
        <MessageActions>
          <CopyAction text={msg.content} />
        </MessageActions>
      </MessageContent>
    </Message>
  );
});

// ── Config Modal ──
function ConfigModal({ show, onClose, config, onSave }: {
  show: boolean;
  onClose: () => void;
  config: AIProviderConfig;
  onSave: (c: AIProviderConfig) => void;
}) {
  const [local, setLocal] = useState(config);
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">AI Settings</h3>
          <button onClick={onClose} className="modal-close" type="button"><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">API Endpoint</label>
            <input type="url" className="field-input" dir="ltr" placeholder="https://api.openai.com/v1/chat/completions"
              value={local.apiEndpoint} onChange={e => setLocal({ ...local, apiEndpoint: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">API Key</label>
            <input type="password" className="field-input" dir="ltr" placeholder="sk-..."
              value={local.apiKey} onChange={e => setLocal({ ...local, apiKey: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">Model</label>
            <input type="text" className="field-input" dir="ltr" placeholder="gpt-4o / mistral-small / ..."
              value={local.model} onChange={e => setLocal({ ...local, model: e.target.value })} />
          </div>
        </div>
        <button className="modal-submit" onClick={() => { onSave(local); onClose(); }}
          disabled={!local.apiEndpoint || !local.model}>
          Save & Close
        </button>
      </div>
    </div>
  );
}

// ── Main ChatPage ──
export default function ChatPage() {
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
  const [config, setConfig] = useState<AIProviderConfig>(INITIAL_CONFIG);
  const [showConfig, setShowConfig] = useState(!config.apiEndpoint);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // ── Auto-scroll ──
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distFromBottom < 120);
  }, []);

  useEffect(() => { scrollToBottom(); }, [state.messages, state.streamingText, scrollToBottom]);

  // ── Persist ──
  useEffect(() => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: state.messages, updatedAt: Date.now() }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, [state.messages, activeSessionId]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

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

  // ── Config ──
  const saveConfig = (c: AIProviderConfig) => {
    setConfig(c);
    localStorage.setItem('ai_api_endpoint', c.apiEndpoint);
    localStorage.setItem('ai_api_key', c.apiKey);
    localStorage.setItem('ai_model', c.model);
    localStorage.setItem('ai_provider_name', c.providerName || '');
  };

  // ── Send / Stop ──
  const handleStop = () => {
    abortRef.current?.abort();
    dispatch({ type: 'SET_STREAMING', value: false });
    dispatch({ type: 'SET_ABORTED', value: true });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || state.streaming || !config.apiEndpoint || !config.model) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    setInput('');
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
        }
      }

      if (!abortRef.current?.signal.aborted && fullText) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: fullText,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            timestamp: Date.now(),
          },
        });
      }
      dispatch({ type: 'SET_STREAMING', value: false });
      dispatch({ type: 'CLEAR_STREAMING_TEXT' });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Request failed' });
      dispatch({ type: 'SET_STREAMING', value: false });
    }
  };

  // ── Render ──
  return (
    <div className="chat-page">
      {/* Sidebar backdrop */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <button onClick={handleNewSession} className="sidebar-btn sidebar-btn--new" type="button">
            <Plus size={15} /> <span>New</span>
          </button>
        </div>
        <div className="sidebar-search">
          <Search size={14} />
          <input placeholder="Search..." className="sidebar-search-input" />
        </div>
        <div className="sidebar-list">
          {sessions.map(s => (
            <div key={s.id} onClick={() => switchSession(s.id)}
              className={`sidebar-item ${s.id === activeSessionId ? 'sidebar-item--active' : ''}`}>
              <MessageSquare size={14} className="sidebar-item-icon" />
              <span className="sidebar-item-label">{s.title}</span>
              {sessions.length > 1 && (
                <button onClick={e => { e.stopPropagation(); handleDeleteSession(s.id); }}
                  className="sidebar-item-delete" type="button" aria-label="Delete">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="chat-main">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button onClick={() => setSidebarOpen(o => !o)} className="header-btn" type="button" aria-label="Toggle sidebar">
              <PanelLeft size={16} />
            </button>
          </div>
          <div className="header-center">
            <div className="header-brand">
              <SparklesIcon size={14} />
              <span className="header-brand-text">Hermes</span>
            </div>
          </div>
          <div className="header-right">
            <button onClick={() => setShowConfig(true)} className="header-btn" type="button" aria-label="Settings">
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages" ref={messagesContainerRef} onScroll={handleScroll}>
          {state.messages.length === 0 && !state.streaming && (
            <div className="empty">
              <Greeting />
              <div style={{ marginTop: 40 }}>
                <SuggestedActions onSelect={(text) => { setInput(text); }} />
              </div>
            </div>
          )}

          <div className="messages-inner">
            {state.messages.map(msg => (
              <PreviewMessage key={msg.id} msg={msg} />
            ))}

            {state.streaming && (
              <ThinkingMessage streamingText={state.streamingText} />
            )}

            {state.currentToolCalls.length > 0 && (
              <div className="message-tools" style={{ maxWidth: 768, margin: '0 auto' }}>
                {state.currentToolCalls.map((tc, i) => <ToolCard key={i} tc={tc} />)}
              </div>
            )}

            {state.error && (
              <div className="error" style={{ maxWidth: 768, margin: '12px auto' }}>
                <span>{state.error}</span>
                <button onClick={() => dispatch({ type: 'SET_ERROR', error: null })} className="error-dismiss" type="button">
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom */}
        <ScrollToBottom isAtBottom={isAtBottom} onClick={() => scrollToBottom(true)} />

        {/* Composer */}
        <div className="composer">
          <div className="composer-inner">
            <PromptInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleSend}
              onStop={handleStop}
              status={state.streaming ? 'streaming' : 'ready'}
              placeholder={!config.apiEndpoint ? 'Set up AI provider first...' : 'Ask anything...'}
              disabled={!config.apiEndpoint || !config.model}
            />
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal show={showConfig} onClose={() => setShowConfig(false)} config={config} onSave={saveConfig} />
    </div>
  );
}
