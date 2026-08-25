import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useSyncExternalStore } from 'react';
import { MessageResponse } from './chatbot';
import { chatStore } from '../ai/chatStore';
import { getAuthUser } from '../utils/api';
import type { AIChatMessage, AIProviderConfig, ChatAttachment } from '../types';
import {
  PanelRight, Plus, MessageSquare, X, Trash2, Search, Settings2,
  Sparkles, ArrowUp, Square, Database, FolderSearch, FileText, GitBranch,
  Terminal, Plug, ChevronDown, Check, AlertTriangle, Pin, Paperclip, RotateCcw,
} from 'lucide-react';
import ArtifactCard, { ArtifactGenerating } from './ArtifactCard';
import './chatbot/chatbot.css';
import './ai-workspace.css';

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
  search_records: 'جستجوی رکوردها',
  get_record_stats: 'آمار رکوردها',
  get_table_schema: 'ساختار پایگاه داده',
  execute_query: 'اجرای پرسوجو',
  get_current_time: 'دریافت زمان فعلی',
  generate_monthly_report: 'ساخت گزارش ماهانه (PDF)',
  create_artifact: 'ساخت فایل خروجی',
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
const ChatMessage = memo(function ChatMessage({ msg, onRetry }: {
  msg: AIChatMessage;
  onRetry?: (msg: AIChatMessage) => void;
}) {
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

        {msg.status === 'failed' && (
          <div className="aiw-msg-status aiw-msg-status--failed">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{msg.error || 'پاسخ کامل نشد'}</span>
            {onRetry && (
              <button type="button" className="ds-btn ds-btn--sm" onClick={() => onRetry(msg)}>
                <RotateCcw className="h-3 w-3" /> تلاش مجدد
              </button>
            )}
          </div>
        )}
        {msg.status === 'cancelled' && (
          <div className="aiw-msg-status aiw-msg-status--cancelled">تولید پاسخ متوقف شد — بخشهای تولیدشده حفظ شدهاند.</div>
        )}

        {msg.artifacts && msg.artifacts.length > 0 && (
          <div className="aiw-artifacts">
            {msg.artifacts.map(a => <ArtifactCard key={a.id} artifact={a} />)}
          </div>
        )}

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
  { icon: <Database className="h-4 w-4" />, title: 'گزارش ماهانه PDF', prompt: 'یک خلاصه گزارش از تغییرات این ماه برایم بساز. خروجی را به صورت PDF بهم بده.' },
  { icon: <Database className="h-4 w-4" />, title: 'تحلیل رکوردها', prompt: 'رکوردهای این فضای کاری را تحلیل کن و موارد غیرعادی مبلغ را پیدا کن.' },
  { icon: <FolderSearch className="h-4 w-4" />, title: 'جستجوی رکورد', prompt: 'رکوردهای پرداختنشده را فهرست کن.' },
  { icon: <GitBranch className="h-4 w-4" />, title: 'خروجی CSV', prompt: 'رکوردهای این ماه را در قالب CSV بهم بده.' },
];

/* ────────────────────────────  Main  ──────────────────────────── */
export default function ChatPage({ workspaceId, workspaceName, recordCount, initialPrompt, onPromptConsumed }: {
  workspaceId?: number | null;
  workspaceName?: string;
  recordCount?: number;
  initialPrompt?: string;
  onPromptConsumed?: () => void;
}) {
  const snap = useSyncExternalStore(chatStore.subscribe, chatStore.getSnapshot);

  /* UI state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1024);
  const [sessionSearch, setSessionSearch] = useState('');

  /* Chat state — lives in the store, survives navigation */
  const activeSession = snap.sessions.find(s => s.id === snap.activeSessionId) || snap.sessions[0];
  const isStreamingHere = snap.streamingSessionId === activeSession?.id;
  const isStreamingAnywhere = snap.streamingSessionId !== null;

  const [input, setInput] = useState(initialPrompt || '');
  const consumedPromptRef = useRef(false);

  useEffect(() => {
    if (initialPrompt && !consumedPromptRef.current) {
      consumedPromptRef.current = true;
      onPromptConsumed?.();
    }
  }, [initialPrompt, onPromptConsumed]);
  const [config, setConfig] = useState<AIProviderConfig>(INITIAL_CONFIG);
  const [showConfig, setShowConfig] = useState(!config.apiEndpoint);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    if (isAtBottom && isStreamingHere) scrollToBottom(false);
  }, [snap.streamingText, isAtBottom, isStreamingHere, scrollToBottom]);

  useEffect(() => {
    if (activeSession && activeSession.messages.length > 0) scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  /* Composer auto-resize */
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, []);
  useEffect(resizeTextarea, [input, resizeTextarea]);

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

  /* Session management — store-owned, stream keeps running across switches */
  const switchSession = useCallback((id: string) => {
    chatStore.switchSession(id);
    setSidebarOpen(false);
  }, []);

  const handleNewSession = () => {
    chatStore.newSession();
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  /* Config */
  const saveConfig = (c: AIProviderConfig) => {
    setConfig(c);
    localStorage.setItem('ai_api_endpoint', c.apiEndpoint);
    localStorage.setItem('ai_api_key', c.apiKey);
    localStorage.setItem('ai_model', c.model);
    localStorage.setItem('ai_provider_name', c.providerName || '');
  };

  /* Send / Stop — lifecycle owned by the store */
  const handleStop = useCallback(() => {
    chatStore.stop();
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isStreamingAnywhere || !config.apiEndpoint || !config.model) return;
    const sessionId = chatStore.ensureSession();
    chatStore.sendMessage({
      sessionId,
      text,
      attachments,
      config,
      workspaceId: workspaceId ?? undefined,
      workspaceName,
    });
    setInput('');
    setAttachments([]);
    setIsAtBottom(true);
  }, [input, attachments, isStreamingAnywhere, config, workspaceId, workspaceName]);

  /** Re-send the same prompt after a failed generation. */
  const handleRetry = useCallback((failed: AIChatMessage) => {
    if (isStreamingAnywhere || !config.apiEndpoint || !config.model) return;
    const session = activeSession;
    if (!session) return;
    const idx = session.messages.indexOf(failed);
    const prevUser = [...session.messages.slice(0, idx)].reverse().find(m => m.role === 'user');
    if (!prevUser) return;
    chatStore.sendMessage({
      sessionId: session.id,
      text: prevUser.content,
      attachments: prevUser.attachments,
      config,
      workspaceId: workspaceId ?? undefined,
      workspaceName,
    });
  }, [activeSession, isStreamingAnywhere, config, workspaceId, workspaceName]);

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

    const filtered = snap.sessions.filter(s =>
      !sessionSearch.trim() || s.title.toLowerCase().includes(sessionSearch.trim().toLowerCase())
    );

    const groups: Array<{ label: string; items: typeof snap.sessions }> = [
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
  }, [snap.sessions, sessionSearch]);

  /* Context panel stats — all real */
  const sessionToolCount = activeSession?.messages.reduce((n, m) => n + (m.toolCalls?.length || 0), 0)
    + (isStreamingHere ? snap.runningToolCalls.length : 0);
  const endpointHost = (() => {
    try { return new URL(config.apiEndpoint).host; } catch { return null; }
  })();

  const activeTitle = activeSession?.messages.length ? activeSession.title : 'گفتگوی جدید';
  const showEmpty = !activeSession || (activeSession.messages.length === 0 && !isStreamingHere);

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
                  className={`aiw-side-item ${s.id === snap.activeSessionId ? 'aiw-side-item--active' : ''}`}
                  onClick={() => switchSession(s.id)}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') switchSession(s.id); }}>
                  {snap.streamingSessionId === s.id
                    ? <span className="aiw-side-item-live" title="در حال تولید پاسخ" />
                    : <MessageSquare className="h-3.5 w-3.5 aiw-side-item-icon" />}
                  <span className="aiw-side-item-label" title={s.title}>{s.title}</span>
                  <span className="aiw-side-item-actions">
                    <button onClick={e => { e.stopPropagation(); chatStore.togglePin(s.id); }}
                      className={`aiw-side-item-btn ${s.pinned ? 'aiw-side-item-btn--on' : ''}`}
                      type="button" aria-label={s.pinned ? 'برداشتن پین' : 'پین کردن'} title={s.pinned ? 'برداشتن پین' : 'پین کردن'}>
                      <Pin className="h-3 w-3" />
                    </button>
                    {snap.sessions.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); chatStore.deleteSession(s.id); }}
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
          {isStreamingAnywhere && (
            <span className="aiw-streaming-chip" role="status">
              <span className="aiw-trace-pulse" /> در حال تولید پاسخ
            </span>
          )}
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
          {showEmpty ? (
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
              {activeSession.messages.map(msg => (
                <ChatMessage key={msg.id} msg={msg} onRetry={handleRetry} />
              ))}

              {isStreamingHere && (
                <div className="aiw-msg aiw-msg--assistant">
                  <div className="aiw-msg-meta">
                    <span className="aiw-msg-agent"><Sparkles className="h-3.5 w-3.5" /> هرمس</span>
                  </div>
                  <div className="aiw-msg-body">
                    {snap.runningToolCalls.length > 0 && !snap.streamingText && (
                      <div className="aiw-thinking">در حال بررسی فضای کاری...</div>
                    )}
                    {snap.streamingText && (
                      <div className="aiw-streaming">
                        <MessageResponse>{snap.streamingText}</MessageResponse>
                        <span className="aiw-cursor" aria-hidden="true" />
                      </div>
                    )}
                    {snap.runningToolCalls.some(t => !t.result && t.name.includes('report')) && (
                      <ArtifactGenerating />
                    )}
                    {snap.runningToolCalls.length > 0 && (
                      <div className="aiw-msg-traces">
                        {snap.runningToolCalls.map((tc, i) => <ToolTrace key={i} tc={tc} />)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {snap.streamError && !isStreamingHere && (
                <div className="aiw-error" role="alert">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="aiw-error-body">
                    <strong>پاسخ کامل نشد</strong>
                    <span>{snap.streamError}</span>
                  </div>
                  <button className="ds-btn ds-btn--sm" type="button" onClick={handleRetry as never} style={{ display: 'none' }} aria-hidden="true" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {!isAtBottom && activeSession && activeSession.messages.length > 0 && (
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
          <div className={`aiw-composer-box ${isStreamingHere ? 'aiw-composer-box--busy' : ''}`}>
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
                  aria-label="پیوست فایل" title="پیوست فایل" disabled={isStreamingHere}>
                  <Paperclip className="h-4 w-4" />
                </button>
                <span className="aiw-composer-hint">
                  {config.model ? <><Plug className="h-3 w-3" /> {config.model}</> : 'بدون اتصال'}
                </span>
              </div>
              {isStreamingHere ? (
                <button className="aiw-send aiw-send--stop" onClick={handleStop} type="button" aria-label="توقف تولید">
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button className="aiw-send" onClick={handleSend} type="button"
                  disabled={(!input.trim() && attachments.length === 0) || isStreamingAnywhere || !config.apiEndpoint || !config.model}
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
                <span className="aiw-ctx-stat-value">{(activeSession?.messages.length || 0).toLocaleString('fa-IR')}</span>
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
              <li><Database className="h-3.5 w-3.5" /> گزارش ماهانه PDF</li>
              <li><Database className="h-3.5 w-3.5" /> پرسوجوی پایگاه داده</li>
              <li><FolderSearch className="h-3.5 w-3.5" /> جستجوی فایل و رکورد</li>
              <li><FileText className="h-3.5 w-3.5" /> ساخت فایل خروجی</li>
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
