import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send, Trash2, Loader2, Bot, User, ChevronDown, ChevronRight,
  Settings, RefreshCw, Copy, Check, FolderTree, FileCode,
} from 'lucide-react';
import { api } from '../utils/api';
import type { AIChatMessage, AIProviderConfig, AISSEEvent } from '../types';
import './AssistantPage.css';

interface State {
  messages: AIChatMessage[];
  streaming: boolean;
  streamingText: string;
  currentToolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  error: string | null;
}

type Action =
  | { type: 'ADD_MESSAGE'; message: AIChatMessage }
  | { type: 'SET_STREAMING'; value: boolean }
  | { type: 'APPEND_TEXT'; text: string }
  | { type: 'CLEAR_STREAMING_TEXT' }
  | { type: 'ADD_TOOL_CALL'; name: string; args: Record<string, unknown> }
  | { type: 'ADD_TOOL_RESULT'; toolCallId: string; result: unknown }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'SET_STREAMING':
      return { ...state, streaming: action.value };
    case 'APPEND_TEXT':
      return { ...state, streamingText: state.streamingText + action.text };
    case 'CLEAR_STREAMING_TEXT':
      return { ...state, streamingText: '' };
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
    case 'CLEAR':
      return { messages: [], streaming: false, streamingText: '', currentToolCalls: [], error: null };
    default:
      return state;
  }
}

const INITIAL_CONFIG: AIProviderConfig = {
  apiEndpoint: localStorage.getItem('ai_api_endpoint') || '',
  apiKey: localStorage.getItem('ai_api_key') || '',
  model: localStorage.getItem('ai_model') || '',
  providerName: localStorage.getItem('ai_provider_name') || '',
};

export default function AssistantPage() {
  const [state, dispatch] = useReducer(reducer, {
    messages: (() => {
      try {
        const saved = localStorage.getItem('hermes_messages');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    streaming: false,
    streamingText: '',
    currentToolCalls: [],
    error: null,
  });

  const [input, setInput] = useState('');
  const [config, setConfig] = useState<AIProviderConfig>(INITIAL_CONFIG);
  const [showConfig, setShowConfig] = useState(!config.apiEndpoint);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [state.messages, state.streamingText, scrollToBottom]);

  // Persist messages to localStorage
  useEffect(() => {
    if (state.messages.length > 0) {
      localStorage.setItem('hermes_messages', JSON.stringify(state.messages));
    }
  }, [state.messages]);

  const saveConfig = (newConfig: AIProviderConfig) => {
    setConfig(newConfig);
    localStorage.setItem('ai_api_endpoint', newConfig.apiEndpoint);
    localStorage.setItem('ai_api_key', newConfig.apiKey);
    localStorage.setItem('ai_model', newConfig.model);
    localStorage.setItem('ai_provider_name', newConfig.providerName || '');
  };

  const fetchModels = async () => {
    if (!config.apiEndpoint || !config.apiKey) return;
    setFetchingModels(true);
    try {
      const res = await api.fetchAIModels(config.apiEndpoint, config.apiKey);
      const models = (res as any).models || [];
      setAvailableModels(models);
    } catch {
      setAvailableModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || state.streaming || !config.apiEndpoint || !config.model) return;

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
    dispatch({ type: 'SET_ERROR', error: null });

    const apiMessages = [...state.messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const stream = api.aiChat(apiMessages, config);
      let fullText = '';
      const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

      for await (const event of stream as AsyncIterable<AISSEEvent>) {
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
            break;
        }
      }

      const assistantMsg: AIChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', message: assistantMsg });
      dispatch({ type: 'SET_STREAMING', value: false });
      dispatch({ type: 'CLEAR_STREAMING_TEXT' });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      dispatch({ type: 'SET_ERROR', error: msg });
      dispatch({ type: 'SET_STREAMING', value: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleToolExpand = (idx: number) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const renderToolCall = (tc: { name: string; args: Record<string, unknown> }, idx: number) => {
    const isExpanded = expandedTools.has(idx);
    const argsStr = JSON.stringify(tc.args, null, 2);
    return (
      <div key={idx} className="ap-tool-call">
        <button className="ap-tool-header" onClick={() => toggleToolExpand(idx)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FileCode size={14} />
          <span className="ap-tool-name">{tc.name}</span>
        </button>
        {isExpanded && (
          <pre className="ap-tool-args">
            <code>{argsStr}</code>
            <button className="ap-copy-btn" onClick={() => copyToClipboard(argsStr, `tool-${idx}`)}>
              {copiedId === `tool-${idx}` ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="ap">
      {/* Config Panel */}
      {showConfig && (
        <div className="ap-config-overlay">
          <div className="ap-config-panel">
            <div className="ap-config-header">
              <Settings size={18} />
              <h3>AI Provider Configuration</h3>
            </div>
            <div className="ap-config-field">
              <label>API Endpoint</label>
              <input
                type="url"
                value={config.apiEndpoint}
                onChange={e => saveConfig({ ...config, apiEndpoint: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
                dir="ltr"
              />
              <span className="ap-config-hint">OpenAI-compatible endpoint URL</span>
            </div>
            <div className="ap-config-field">
              <label>API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={e => saveConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
                dir="ltr"
              />
            </div>
            <div className="ap-config-field">
              <label>Model</label>
              <div className="ap-model-row">
                <input
                  type="text"
                  value={config.model}
                  onChange={e => saveConfig({ ...config, model: e.target.value })}
                  placeholder="gpt-4o / deepseek-chat / ..."
                  dir="ltr"
                  list="ap-models-list"
                />
                <datalist id="ap-models-list">
                  {availableModels.map(m => <option key={m} value={m} />)}
                </datalist>
                <button className="ap-btn-sm" onClick={fetchModels} disabled={fetchingModels}>
                  {fetchingModels ? <Loader2 size={14} className="ap-spin" /> : <RefreshCw size={14} />}
                </button>
              </div>
              {availableModels.length > 0 && (
                <span className="ap-config-hint">{availableModels.length} models available</span>
              )}
            </div>
            <div className="ap-config-field">
              <label>Provider Name (optional)</label>
              <input
                type="text"
                value={config.providerName || ''}
                onChange={e => saveConfig({ ...config, providerName: e.target.value })}
                placeholder="openai / openrouter / custom"
                dir="ltr"
              />
            </div>
            <button
              className="ap-btn ap-btn-primary ap-config-save"
              onClick={() => setShowConfig(false)}
              disabled={!config.apiEndpoint || !config.model}
            >
              Save & Start
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="ap-header">
        <div className="ap-header-left">
          <Bot size={20} />
          <h2>Hermes Assistant</h2>
        </div>
        <div className="ap-header-actions">
          <button className="ap-btn-icon" onClick={() => setShowConfig(true)} title="Configure AI">
            <Settings size={16} />
          </button>
          <button className="ap-btn-icon" onClick={() => { dispatch({ type: 'CLEAR' }); localStorage.removeItem('hermes_messages'); }} title="Clear conversation">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ap-messages">
        {state.messages.length === 0 && !state.streaming && (
          <div className="ap-empty">
            <Bot size={48} className="ap-empty-icon" />
            <p>Ask Hermes anything about your project</p>
            <div className="ap-suggestions">
              {[
                'Explain the project structure',
                'Create a new React component',
                'Run the tests',
                'Show git status',
              ].map(s => (
                <button key={s} className="ap-suggestion" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {state.messages.map(msg => (
          <div key={msg.id} className={`ap-message ap-message-${msg.role}`}>
            <div className="ap-message-avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="ap-message-content">
              {msg.role === 'assistant' ? (
                <div className="ap-markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const code = String(children).replace(/\n$/, '');
                        if (match) {
                          return (
                            <div className="ap-code-block">
                              <div className="ap-code-lang">{match[1]}</div>
                              <button
                                className="ap-copy-btn"
                                onClick={() => copyToClipboard(code, `code-${msg.id}-${match[1]}`)}
                              >
                                {copiedId === `code-${msg.id}-${match[1]}` ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '0.8125rem' }}
                              >
                                {code}
                              </SyntaxHighlighter>
                            </div>
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="ap-user-text">{msg.content}</div>
              )}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="ap-tool-calls">
                  {msg.toolCalls.map((tc, i) => renderToolCall(tc, i))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {state.streaming && state.streamingText && (
          <div className="ap-message ap-message-assistant">
            <div className="ap-message-avatar"><Bot size={16} /></div>
            <div className="ap-message-content">
              <div className="ap-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (match) {
                        return (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, fontSize: '0.8125rem' }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        );
                      }
                      return <code className={className} {...props}>{children}</code>;
                    },
                  }}
                >
                  {state.streamingText}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {state.streaming && !state.streamingText && (
          <div className="ap-message ap-message-assistant">
            <div className="ap-message-avatar"><Bot size={16} /></div>
            <div className="ap-message-content">
              <div className="ap-thinking">
                <Loader2 size={16} className="ap-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Tool calls while streaming */}
        {state.streaming && state.currentToolCalls.length > 0 && (
          <div className="ap-message ap-message-assistant">
            <div className="ap-message-avatar"><Bot size={16} /></div>
            <div className="ap-message-content">
              <div className="ap-tool-calls">
                {state.currentToolCalls.map((tc, i) => renderToolCall(tc, i))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="ap-error">
            <span>{state.error}</span>
            <button onClick={() => dispatch({ type: 'SET_ERROR', error: null })}>Dismiss</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ap-input-area">
        <div className="ap-input-wrapper">
          <textarea
            ref={textareaRef}
            className="ap-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.apiEndpoint ? 'Ask Hermes...' : 'Configure AI provider first...'}
            rows={1}
            disabled={!config.apiEndpoint || !config.model}
            onInput={e => {
              const ta = e.target as HTMLTextAreaElement;
              ta.style.height = 'auto';
              ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
            }}
          />
          <button
            className="ap-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || state.streaming || !config.apiEndpoint || !config.model}
          >
            {state.streaming ? <Loader2 size={18} className="ap-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="ap-input-hint">
          Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
