import { useState, useRef, useEffect, useCallback, useReducer, useMemo, memo } from 'react';
import { MessageResponse } from './chatbot';
import { api, getAuthUser } from '../utils/api';
import type { AIChatMessage, AIProviderConfig, AISSEEvent, ChatAttachment } from '../types';
import {
  PanelRight, Plus, MessageSquare, X, Trash2, Search, Settings2,
  Sparkles, ArrowUp, Square, Database, FolderSearch, FileText, GitBranch,
  Terminal, Plug, ChevronDown, Check, AlertTriangle, Pin, Paperclip,
} from 'lucide-react';
import './chatbot/chatbot.css';
import './ai-workspace.css';

/* ────────────────────────────  Session types  ──────────────────────────── */
interface ChatSession {
  id: string;
  title: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

/* ────────────────────────────  Reducer  ──────────────────────────── */
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

/* ────────────────────────────  Session storage  ──────────────────────────── */
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
    title: 'گفتگوی جدید',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function deriveTitle(msg: string): string {
  const cleaned = msg.replace(/\s+/g, ' ').trim();
  return cleaned.length > 35 ? cleaned.slice(0, 35) + '…' : cleaned;
}

/* ────────────────────────────  Config  ──────────────────────────── */
const INITIAL_CONFIG: AIProviderConfig = {
  apiEndpoint: localStorage.getItem('ai_api_endpoint') || '',
  apiKey: localStorage.getItem('ai_api_key') || '',
  model: localStorage.getItem('ai_model') || '',
  providerName: localStorage.getItem('ai_provider_name') || '',
};

/* ────────────────────────────  Tool trace  ──────────────────────────── */
const TOOL_LABELS: Record<string, string> = {
  database: 'پایگاه داده',
  db: 'پایگاه داده',
  query: 'پرسوجوی داده',
  db_query: 'پرسوجوی داده',
  files: 'فایلها',
  file: 'فایل',
  read_file: 'خواندن فایل',
  list_files: 'فهرست فایلها',
  search: 'جستجو',
  search_files: 'جستجوی فایلها',
  git: 'تاریخچه تغییرات',
  shell: 'دستور سیستمی',
  mcp: 'ابزار خارجی',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] || TOOL_LABELS[name.split('.')[0]] || name;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

const ToolTrace = memo(function ToolTrace({ tc }: {
  tc: { name: string; args: Record<string, unknown>; result?: unknown };
}) {
  const [open, setOpen] = useState(false);
  const done = tc.result !== undefined;
  const resultStr = done
    ? (typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2))
    : null;

  return (
    <div className={`aiw-trace ${open ? 'aiw-trace--open' : ''}`}>
      <button type="button" className="aiw-trace-head" onClick={() => setOpen(o => !o)}
        aria-expanded={open}>
        <span className={`aiw-trace-status ${done ? 'aiw-trace-status--done' : 'aiw-trace-status--run'}`} aria-hidden="true">
          {done ? <Check className="h-3 w-3" /> : <span className="aiw-trace-pulse" />}
        </span>
        <span className="aiw-trace-name">{toolLabel(tc.name)}</span>
        <span className="aiw-trace-tool" dir="ltr">{tc.name}</span>
        <ChevronDown className="h-3.5 w-3.5 aiw-trace-chevron" />
      </button>
      {open && (
        <div className="aiw-trace-body">
          <div className="aiw-trace-section">
            <span className="aiw-trace-label">ورودی</span>
            <pre className="aiw-trace-code" dir="ltr">{JSON.stringify(tc.args, null, 2)}</pre>
          </div>
          {resultStr !== null && (
            <div className="aiw-trace-section">
              <span className="aiw-trace-label">نتیجه</span>
              <pre className="aiw-trace-code" dir="ltr">{truncate(resultStr, 1200)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* ────────────────────────────  Attachments  ──────────────────────────── */
const MessageAttachments = memo(function MessageAttachments({ attachments }: { attachments?: ChatAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="aiw-attachments">
      {attachments.map(a => {
        const isImage = a.type?.startsWith('image/') && a.url;
        return isImage ? (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="aiw-attachment-img-wrap">
            <img src={a.url} alt={a.name} className="aiw-attachment-img" loading="lazy" />
          </a>
        ) : (
          <a key={a.id} href={a.url} download={a.name} className="aiw-attachment" title={a.name}>
            <FileText className="h-3.5 w-3.5" />
            <span className="aiw-attachment-name">{a.name}</span>
            {a.size !== undefined && (
              <span className="aiw-attachment-size">{Math.max(1, Math.round(a.size / 1024)).toLocaleString('fa-IR')} KB</span>
            )}
          </a>
        );
      })}
    </div>
  );
});

/* ────────────────────────────  Message  ──────────────────────────── */
const ChatMessage = memo(function ChatMessage({ msg }: { msg: AIChatMessage }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="aiw-msg aiw-msg--user">
        <MessageAttachments attachments={msg.attachments} />
        <div className="aiw-msg-bubble">{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="aiw-msg aiw-msg--assistant">
      <div className="aiw-msg-meta">
        <span className="aiw-msg-agent">
          <Sparkles className="h-3.5 w-3.5" />
          هرمس
        </span>
        <button type="button" className="aiw-msg-copy" onClick={copy}
          aria-label="کپی پاسخ" title="کپی پاسخ">
          {copied ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="aiw-msg-body">
        <MessageResponse>{msg.content}</MessageResponse>
        <MessageAttachments attachments={msg.attachments} />
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="aiw-msg-traces">
            {msg.toolCalls.map((tc, i) => (
              <ToolTrace key={i} tc={{ name: tc.toolName, args: tc.args }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

/* ────────────────────────────  Config modal  ──────────────────────────── */
function ConfigModal({ show, onClose, config, onSave }: {
  show: boolean;
  onClose: () => void;
  config: AIProviderConfig;
  onSave: (c: AIProviderConfig) => void;
}) {
  const [local, setLocal] = useState(config);
  if (!show) return null;
  return (
    <div className="aiw-modal-overlay" onClick={onClose}>
      <div className="aiw-modal" role="dialog" aria-modal="true" aria-label="تنظیمات هوش مصنوعی" onClick={e => e.stopPropagation()}>
        <div className="aiw-modal-head">
          <h3>تنظیمات هوش مصنوعی</h3>
          <button onClick={onClose} className="aiw-modal-close" type="button" aria-label="بستن"><X size={15} /></button>
        </div>
        <div className="aiw-modal-body">
          <label className="aiw-modal-label" htmlFor="cfg-endpoint">آدرس API</label>
          <input id="cfg-endpoint" type="url" dir="ltr" className="ds-input"
            placeholder="https://api.openai.com/v1/chat/completions"
            value={local.apiEndpoint} onChange={e => setLocal({ ...local, apiEndpoint: e.target.value })} />
          <label className="aiw-modal-label" htmlFor="cfg-key">کلید API</label>
          <input id="cfg-key" type="password" dir="ltr" className="ds-input" autoComplete="off"
            placeholder="sk-..."
            value={local.apiKey} onChange={e => setLocal({ ...local, apiKey: e.target.value })} />
          <label className="aiw-modal-label" htmlFor="cfg-model">مدل</label>
          <input id="cfg-model" type="text" dir="ltr" className="ds-input"
            placeholder="gpt-4o / deepseek-chat / ..."
            value={local.model} onChange={e => setLocal({ ...local, model: e.target.value })} />
          <p className="aiw-modal-hint">این اطلاعات در تنظیمات برنامه نیز ذخیره میشود و بلافاصله اعمال میگردد.</p>
        </div>
        <div className="aiw-modal-actions">
          <button className="ds-btn" type="button" onClick={onClose}>انصراف</button>
          <button className="ds-btn ds-btn--primary" type="button"
            onClick={() => { onSave(local); onClose(); }}
            disabled={!local.apiEndpoint || !local.model}>
            ذخیره و بستن
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────  Suggestions  ──────────────────────────── */
const SUGGESTIONS: Array<{ icon: React.ReactNode; title: string; prompt: string }> = [
  { icon: <Database className="h-4 w-4" />, title: 'تحلیل رکوردها', prompt: 'رکوردهای این فضای کاری را تحلیل کن و موارد غیرعادی مبلغ را پیدا کن.' },
  { icon: <FolderSearch className="h-4 w-4" />, title: 'جستجوی رکورد', prompt: 'رکوردهای پرداختنشده را فهرست کن.' },
  { icon: <FileText className="h-4 w-4" />, title: 'کار با فایلها', prompt: 'آخرین فایل اکسل را بخوان و خلاصهاش را بده.' },
  { icon: <GitBranch className="h-4 w-4" />, title: 'گزارش ماهانه', prompt: 'یک خلاصه گزارش از تغییرات این ماه برایم بساز.' },
];

/* ────────────────────────────  Main  ──────────────────────────── */
export default function ChatPage({ workspaceName, recordCount }: { workspaceName?: string; recordCount?: number }) {
  /* Sessions */
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

  /* UI state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1024);
  const [sessionSearch, setSessionSearch] = useState('');

  /* Chat state */
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Attachments — user can send files; agent responses may carry them too */
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const authUser = getAuthUser();

  /* Auto-scroll — only when user is near the bottom */
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const handleThreadScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distFromBottom < 120);
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom(false);
  }, [state.messages, state.streamingText, isAtBottom, scrollToBottom]);

  /* Persist — debounced so streaming doesn't thrash localStorage */
  useEffect(() => {
    if (!activeSessionId) return;
    const id = setTimeout(() => {
      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: state.messages, updatedAt: Date.now() }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    }, 300);
    return () => clearTimeout(id);
  }, [state.messages, activeSessionId]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  /* Composer auto-resize */
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, []);
  useEffect(resizeTextarea, [input, resizeTextarea]);

  /* Session management */
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
    textareaRef.current?.focus();
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (id === activeSessionId) switchSession(updated[0].id);
  };

  const togglePin = (id: string) => {
    const updated = sessions.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s);
    setSessions(updated);
    saveSessions(updated);
  };

  /* Config */
  const saveConfig = (c: AIProviderConfig) => {
    setConfig(c);
    localStorage.setItem('ai_api_endpoint', c.apiEndpoint);
    localStorage.setItem('ai_api_key', c.apiKey);
    localStorage.setItem('ai_model', c.model);
    localStorage.setItem('ai_provider_name', c.providerName || '');
  };

  /* Send / Stop */
  const handleStop = () => {
    abortRef.current?.abort();
    dispatch({ type: 'SET_STREAMING', value: false });
    dispatch({ type: 'SET_ABORTED', value: true });
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || state.streaming || !config.apiEndpoint || !config.model) return;

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
    setIsAtBottom(true);
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
      let agentAttachments: ChatAttachment[] | undefined;

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
            dispatch({ type: 'SET_ERROR', error: event.error || 'خطای ناشناخته' });
            break;
        }
        if (event.attachments && event.attachments.length) {
          agentAttachments = [...(agentAttachments || []), ...event.attachments];
        }
      }

      if (!abortRef.current?.signal.aborted && (fullText || agentAttachments)) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: fullText,
            attachments: agentAttachments,
            toolCalls: toolCalls.length > 0
              ? toolCalls.map(t => ({ toolName: t.name, args: t.args }))
              : undefined,
            timestamp: Date.now(),
          },
        });
      }
      dispatch({ type: 'SET_STREAMING', value: false });
      dispatch({ type: 'CLEAR_STREAMING_TEXT' });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'ارسال درخواست ناموفق بود' });
      dispatch({ type: 'SET_STREAMING', value: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  /* Session grouping */
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const weekAgo = startOfToday - 7 * 86400000;

    const filtered = sessions.filter(s =>
      !sessionSearch.trim() || s.title.toLowerCase().includes(sessionSearch.trim().toLowerCase())
    );

    const groups: Array<{ label: string; items: ChatSession[] }> = [
      { label: 'پینشده', items: [] },
      { label: 'امروز', items: [] },
      { label: 'دیروز', items: [] },
      { label: 'هفته گذشته', items: [] },
      { label: 'قدیمیتر', items: [] },
    ];

    for (const s of filtered) {
      if (s.pinned) groups[0].items.push(s);
      else if (s.updatedAt >= startOfToday) groups[1].items.push(s);
      else if (s.updatedAt >= startOfYesterday) groups[2].items.push(s);
      else if (s.updatedAt >= weekAgo) groups[3].items.push(s);
      else groups[4].items.push(s);
    }
    return groups.filter(g => g.items.length > 0);
  }, [sessions, sessionSearch]);

  /* Context panel stats — all real */
  const sessionToolCount = state.messages.reduce((n, m) => n + (m.toolCalls?.length || 0), 0) + state.currentToolCalls.length;
  const endpointHost = (() => {
    try { return new URL(config.apiEndpoint).host; } catch { return null; }
  })();

  const activeTitle = activeSession?.messages.length
    ? activeSession.title
    : 'گفتگوی جدید';

  return (
    <div className={`aiw ${contextOpen ? '' : 'aiw--no-ctx'}`}>
      {/* Mobile backdrop (hidden on desktop via CSS) */}
      {(sidebarOpen || contextOpen) && (
        <div className="aiw-backdrop" onClick={() => { setSidebarOpen(false); setContextOpen(false); }} />
      )}

      {/* ── Conversations sidebar (right in RTL) ── */}
      <aside className={`aiw-side ${sidebarOpen ? 'aiw-side--open' : ''}`} aria-label="تاریخچه گفتگوها">
        <div className="aiw-side-head">
          <span className="aiw-side-brand">
            <Sparkles className="h-4 w-4" />
            هرمس
          </span>
          <button className="aiw-side-close" onClick={() => setSidebarOpen(false)} aria-label="بستن فهرست">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button className="aiw-new-btn" onClick={handleNewSession} type="button">
          <Plus className="h-4 w-4" /> گفتگوی جدید
        </button>
        <div className="aiw-side-search">
          <Search className="h-3.5 w-3.5" />
          <input value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
            placeholder="جستجوی گفتگوها..." aria-label="جستجوی گفتگوها" />
        </div>
        <nav className="aiw-side-list">
          {groupedSessions.length === 0 && (
            <p className="aiw-side-empty">گفتگویی یافت نشد</p>
          )}
          {groupedSessions.map(group => (
            <div key={group.label} className="aiw-side-group">
              <span className="aiw-side-group-label">
                {group.label === 'پینشده' && <Pin className="h-3 w-3" />}
                {group.label}
              </span>
              {group.items.map(s => (
                <div key={s.id}
                  className={`aiw-side-item ${s.id === activeSessionId ? 'aiw-side-item--active' : ''}`}
                  onClick={() => switchSession(s.id)}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') switchSession(s.id); }}>
                  <MessageSquare className="h-3.5 w-3.5 aiw-side-item-icon" />
                  <span className="aiw-side-item-label" title={s.title}>{s.title}</span>
                  <span className="aiw-side-item-actions">
                    <button onClick={e => { e.stopPropagation(); togglePin(s.id); }}
                      className={`aiw-side-item-btn ${s.pinned ? 'aiw-side-item-btn--on' : ''}`}
                      type="button" aria-label={s.pinned ? 'برداشتن پین' : 'پین کردن'} title={s.pinned ? 'برداشتن پین' : 'پین کردن'}>
                      <Pin className="h-3 w-3" />
                    </button>
                    {sessions.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); handleDeleteSession(s.id); }}
                        className="aiw-side-item-btn" type="button" aria-label="حذف گفتگو" title="حذف">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </nav>
        {authUser && (
          <div className="aiw-side-user">
            <span className="aiw-side-user-seal">{(authUser.username || '؟').charAt(0).toUpperCase()}</span>
            <span className="aiw-side-user-name">{authUser.username}</span>
          </div>
        )}
      </aside>

      {/* ── Main thread ── */}
      <div className="aiw-main">
        <header className="aiw-topbar">
          <button className="aiw-topbar-btn aiw-topbar-btn--side" onClick={() => setSidebarOpen(o => !o)}
            aria-label="فهرست گفتگوها" type="button">
            <PanelRight className="h-4 w-4" style={{ transform: 'scaleX(-1)' }} />
          </button>
          <div className="aiw-topbar-title-wrap">
            <span className="aiw-topbar-title">{activeTitle}</span>
            <span className="aiw-topbar-sub">
              {workspaceName ? `فضای کاری ${workspaceName}` : 'دستیار هوشمند'}
            </span>
          </div>
          <span className={`aiw-model-chip ${config.apiEndpoint && config.model ? '' : 'aiw-model-chip--off'}`}
            title={config.model || 'پیکربندی نشده'}>
            <span className="aiw-model-dot" aria-hidden="true" />
            {config.model || 'پیکربندی نشده'}
          </span>
          <button className="aiw-topbar-btn aiw-topbar-btn--ctx" onClick={() => setContextOpen(o => !o)}
            aria-label={contextOpen ? 'بستن پنل زمینه' : 'باز کردن پنل زمینه'} type="button">
            <PanelRight className="h-4 w-4" />
          </button>
          <button className="aiw-topbar-btn" onClick={() => setShowConfig(true)} aria-label="تنظیمات هوش مصنوعی" type="button">
            <Settings2 className="h-4 w-4" />
          </button>
        </header>

        <div className="aiw-thread" ref={messagesContainerRef} onScroll={handleThreadScroll}>
          {state.messages.length === 0 && !state.streaming ? (
            <div className="aiw-empty">
              <div className="aiw-empty-seal" aria-hidden="true">
                <Sparkles className="h-6 w-6" />
                <span className="ds-seal-halo" />
              </div>
              <h2 className="aiw-empty-title">روی چه کار کنیم؟</h2>
              <p className="aiw-empty-desc">
                از هرمس بخواهید رکوردهای فضای کاری را تحلیل کند، فایلها را بخواند یا گزارش بسازد.
              </p>
              <div className="aiw-suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s.title} type="button" className="aiw-suggestion"
                    onClick={() => { setInput(s.prompt); textareaRef.current?.focus(); }}>
                    <span className="aiw-suggestion-icon">{s.icon}</span>
                    <span className="aiw-suggestion-text">
                      <span className="aiw-suggestion-title">{s.title}</span>
                      <span className="aiw-suggestion-desc">{s.prompt}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="aiw-thread-inner">
              {state.messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}

              {state.streaming && (
                <div className="aiw-msg aiw-msg--assistant">
                  <div className="aiw-msg-meta">
                    <span className="aiw-msg-agent"><Sparkles className="h-3.5 w-3.5" /> هرمس</span>
                  </div>
                  <div className="aiw-msg-body">
                    {state.currentToolCalls.length > 0 && !state.streamingText && (
                      <div className="aiw-thinking">در حال بررسی فضای کاری...</div>
                    )}
                    {state.streamingText && (
                      <div className="aiw-streaming">
                        <MessageResponse>{state.streamingText}</MessageResponse>
                        <span className="aiw-cursor" aria-hidden="true" />
                      </div>
                    )}
                    {state.currentToolCalls.length > 0 && (
                      <div className="aiw-msg-traces">
                        {state.currentToolCalls.map((tc, i) => <ToolTrace key={i} tc={tc} />)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {state.error && (
                <div className="aiw-error" role="alert">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="aiw-error-body">
                    <strong>پاسخ کامل نشد</strong>
                    <span>{state.error}</span>
                  </div>
                  <button className="ds-btn ds-btn--sm" type="button" onClick={() => dispatch({ type: 'SET_ERROR', error: null })}>
                    بستن
                  </button>
                </div>
              )}

              {state.aborted && !state.streaming && (
                <div className="aiw-aborted">تولید پاسخ متوقف شد — بخشهای تولیدشده حفظ شدهاند.</div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {!isAtBottom && state.messages.length > 0 && (
            <button className="aiw-jump-bottom" type="button" onClick={() => scrollToBottom(true)}>
              <ChevronDown className="h-4 w-4" /> رفتن به آخر
            </button>
          )}
        </div>

        {/* ── Composer ── */}
        <footer className="aiw-composer">
          {!config.apiEndpoint || !config.model ? (
            <button type="button" className="aiw-config-nudge" onClick={() => setShowConfig(true)}>
              <Settings2 className="h-4 w-4" />
              برای شروع، آدرس API و مدل هوش مصنوعی را تنظیم کنید
            </button>
          ) : null}
          <div className={`aiw-composer-box ${state.streaming ? 'aiw-composer-box--busy' : ''}`}>
            {attachments.length > 0 && (
              <div className="aiw-composer-attachments">
                {attachments.map(a => (
                  <span key={a.id} className="aiw-attachment">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="aiw-attachment-name">{a.name}</span>
                    <button type="button" className="aiw-attachment-remove" onClick={() => handleRemoveAttachment(a.id)}
                      aria-label={`حذف ${a.name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="aiw-composer-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!config.apiEndpoint ? 'ابتدا هوش مصنوعی را پیکربندی کنید...' : 'از هرمس بپرسید... (Enter ارسال، Shift+Enter خط جدید)'}
              rows={1}
              disabled={!config.apiEndpoint || !config.model}
              aria-label="پیام شما"
            />
            <div className="aiw-composer-foot">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input ref={fileInputRef} type="file" multiple hidden
                  onChange={e => { if (e.target.files) handleAttachFiles(Array.from(e.target.files)); e.target.value = ''; }} />
                <button type="button" className="aiw-attach-btn" onClick={() => fileInputRef.current?.click()}
                  aria-label="پیوست فایل" title="پیوست فایل" disabled={state.streaming}>
                  <Paperclip className="h-4 w-4" />
                </button>
                <span className="aiw-composer-hint">
                  {config.model ? <><Plug className="h-3 w-3" /> {config.model}</> : 'بدون اتصال'}
                </span>
              </div>
              {state.streaming ? (
                <button className="aiw-send aiw-send--stop" onClick={handleStop} type="button" aria-label="توقف تولید">
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button className="aiw-send" onClick={handleSend} type="button"
                  disabled={(!input.trim() && attachments.length === 0) || !config.apiEndpoint || !config.model}
                  aria-label="ارسال پیام">
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* ── Context panel (left in RTL) ── */}
      <aside className={`aiw-context ${contextOpen ? '' : 'aiw-context--closed'}`} aria-label="زمینه دستیار">
        <div className="aiw-context-head">
          <span>زمینه</span>
          <button className="aiw-topbar-btn aiw-context-close" onClick={() => setContextOpen(false)} aria-label="بستن پنل زمینه" type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aiw-context-body">
          <section className="aiw-ctx-section">
            <h4 className="aiw-ctx-title">فضای کاری</h4>
            <div className="aiw-ctx-card">
              <span className="aiw-ctx-ws-name">{workspaceName || '—'}</span>
              {recordCount !== undefined && (
                <span className="aiw-ctx-ws-meta">{recordCount.toLocaleString('fa-IR')} رکورد در دسترس</span>
              )}
            </div>
          </section>

          <section className="aiw-ctx-section">
            <h4 className="aiw-ctx-title">این نشست</h4>
            <div className="aiw-ctx-stats">
              <div className="aiw-ctx-stat">
                <span className="aiw-ctx-stat-value">{state.messages.length.toLocaleString('fa-IR')}</span>
                <span className="aiw-ctx-stat-label">پیام</span>
              </div>
              <div className="aiw-ctx-stat">
                <span className="aiw-ctx-stat-value">{sessionToolCount.toLocaleString('fa-IR')}</span>
                <span className="aiw-ctx-stat-label">فراخوانی ابزار</span>
              </div>
            </div>
          </section>

          <section className="aiw-ctx-section">
            <h4 className="aiw-ctx-title">ابزارهای در دسترس</h4>
            <ul className="aiw-ctx-tools">
              <li><Database className="h-3.5 w-3.5" /> پرسوجوی پایگاه داده</li>
              <li><FolderSearch className="h-3.5 w-3.5" /> جستجوی فایل و رکورد</li>
              <li><FileText className="h-3.5 w-3.5" /> خواندن اسناد</li>
              <li><GitBranch className="h-3.5 w-3.5" /> تاریخچه تغییرات</li>
              <li><Terminal className="h-3.5 w-3.5" /> ابزارهای سیستمی</li>
            </ul>
          </section>

          <section className="aiw-ctx-section">
            <h4 className="aiw-ctx-title">اتصال</h4>
            <div className="aiw-ctx-card">
              {endpointHost ? (
                <>
                  <span className="aiw-ctx-conn aiw-ctx-conn--ok">متصل</span>
                  <span className="aiw-ctx-ws-meta" dir="ltr">{endpointHost}</span>
                </>
              ) : (
                <>
                  <span className="aiw-ctx-conn aiw-ctx-conn--off">پیکربندی نشده</span>
                  <button className="ds-btn ds-btn--sm" type="button" onClick={() => setShowConfig(true)}>تنظیم اتصال</button>
                </>
              )}
            </div>
          </section>
        </div>
      </aside>

      <ConfigModal show={showConfig} onClose={() => setShowConfig(false)} config={config} onSave={saveConfig} />
    </div>
  );
}
