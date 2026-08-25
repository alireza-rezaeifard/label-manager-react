import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileText, Download } from 'lucide-react';
import { SparklesIcon, WrenchIcon, CheckCircle2Icon, XCircleIcon, ClockIcon, ChevronDownIcon } from './icons';
import { Shimmer } from './shimmer';
import type { AIChatMessage, ChatAttachment } from '../../types';

// ── Code Block ──
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="ai-chat-code-block">
      <div className="ai-chat-code-header">
        <span className="ai-chat-code-lang">{language}</span>
        <button onClick={handleCopy} className="ai-chat-code-copy" aria-label="Copy code" type="button">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="sr-only">Copy</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '0.8125rem', background: '#0d1117' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// ── Markdown Components ──
const markdownComponents = {
  code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeStr = String(children).replace(/\n$/, '');
    if (match) {
      return <CodeBlock language={match[1]} code={codeStr} />;
    }
    return <code className="ai-chat-inline-code" {...props}>{children}</code>;
  },
  p({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className="ai-chat-md-p" {...props}>{children}</p>;
  },
  ul({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) {
    return <ul className="ai-chat-md-list" {...props}>{children}</ul>;
  },
  ol({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) {
    return <ol className="ai-chat-md-list ai-chat-md-list-ol" {...props}>{children}</ol>;
  },
  li({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) {
    return <li className="ai-chat-md-li" {...props}>{children}</li>;
  },
  h1({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h1 className="ai-chat-md-h1" {...props}>{children}</h1>;
  },
  h2({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className="ai-chat-md-h2" {...props}>{children}</h2>;
  },
  h3({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className="ai-chat-md-h3" {...props}>{children}</h3>;
  },
  table({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
    return <div className="ai-chat-md-table-wrap"><table className="ai-chat-md-table" {...props}>{children}</table></div>;
  },
  th({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
    return <th className="ai-chat-md-th" {...props}>{children}</th>;
  },
  td({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
    return <td className="ai-chat-md-td" {...props}>{children}</td>;
  },
  blockquote({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) {
    return <blockquote className="ai-chat-md-blockquote" {...props}>{children}</blockquote>;
  },
  a({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="ai-chat-md-link" {...props}>{children}</a>;
  },
};

// ── Tool Card ──
function truncateResult(result: unknown, maxLen = 500): string {
  const str = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\n... (truncated)';
}

const ToolCard = memo(function ToolCard({ tc }: { tc: { name: string; args: Record<string, unknown>; result?: unknown } }) {
  const [expanded, setExpanded] = useState(false);
  const argsStr = JSON.stringify(tc.args, null, 2);
  const resultStr = tc.result !== undefined ? truncateResult(tc.result) : null;
  const hasResult = resultStr !== null;
  const isError = tc.result && typeof tc.result === 'object' && 'error' in (tc.result as Record<string, unknown>);

  return (
    <div className={`ai-chat-tool ${expanded ? 'ai-chat-tool-open' : ''}`}>
      <button onClick={() => setExpanded(o => !o)} className="ai-chat-tool-header" type="button">
        <div className="ai-chat-tool-header-left">
          <WrenchIcon size={14} className="ai-chat-tool-icon" />
          <span className="ai-chat-tool-name">{tc.name}</span>
          {hasResult ? (
            <span className={`ai-chat-tool-badge ${isError ? 'ai-chat-tool-badge-error' : 'ai-chat-tool-badge-done'}`}>
              {isError ? <XCircleIcon size={12} /> : <CheckCircle2Icon size={12} />}
              {isError ? 'Error' : 'Done'}
            </span>
          ) : (
            <span className="ai-chat-tool-badge ai-chat-tool-badge-running">
              <ClockIcon size={12} />
              Running
            </span>
          )}
        </div>
        <ChevronDownIcon size={14} className={`ai-chat-tool-chevron ${expanded ? 'ai-chat-tool-chevron-open' : ''}`} />
      </button>
      {expanded && (
        <div className="ai-chat-tool-body">
          <div className="ai-chat-tool-section">
            <h4 className="ai-chat-tool-section-title">Parameters</h4>
            <div className="ai-chat-tool-code-wrap">
              <pre className="ai-chat-tool-code">{argsStr}</pre>
            </div>
          </div>
          {hasResult && (
            <div className="ai-chat-tool-section ai-chat-tool-section-border">
              <h4 className="ai-chat-tool-section-title">{isError ? 'Error' : 'Result'}</h4>
              <div className="ai-chat-tool-code-wrap">
                <pre className="ai-chat-tool-code">{resultStr}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ── Message Actions (copy on hover) ──
function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-chat-message-actions">
      <button className="ai-chat-message-action-btn" onClick={handleCopy} title="Copy" type="button">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

// ── Attachments (files sent by the user or the agent) ──
function FileAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="ai-chat-attachments">
      {attachments.map((a) => {
        const isImage = !!a.type && a.type.startsWith('image/');
        return (
          <div
            key={a.id}
            className={`ai-chat-attachment ${isImage ? 'ai-chat-attachment-image-wrap' : 'ai-chat-attachment-file-wrap'}`}
          >
            {isImage && a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer">
                <img src={a.url} alt={a.name} className="ai-chat-attachment-image" loading="lazy" />
              </a>
            ) : (
              <a href={a.url} download={a.name} className="ai-chat-attachment-file" title="Download">
                <span className="ai-chat-attachment-icon"><FileText size={14} /></span>
                <span className="ai-chat-attachment-name">{a.name}</span>
              </a>
            )}
            {a.url && (
              <a
                href={a.url}
                download={a.name}
                className="ai-chat-attachment-download"
                aria-label="Download"
                title="Download"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={12} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Preview Message ──
export const PreviewMessage = memo(function PreviewMessage({
  msg,
  isLoading,
}: {
  msg: AIChatMessage;
  isLoading: boolean;
}) {
  const isUser = msg.role === 'user';
  const isAssistant = msg.role === 'assistant';

  return (
    <div className="ai-chat-message" data-role={msg.role}>
      <div className={`ai-chat-message-row ${isUser ? 'ai-chat-message-row-user' : 'ai-chat-message-row-assistant'}`}>
        {isAssistant && (
          <div className="ai-chat-avatar">
            <SparklesIcon size={13} />
          </div>
        )}
        <div className="ai-chat-message-content">
          {isUser ? (
            <div className="ai-chat-user-col">
              {msg.attachments && msg.attachments.length > 0 && <FileAttachments attachments={msg.attachments} />}
              <div className="ai-chat-user-bubble">{msg.content}</div>
            </div>
          ) : (
            <div>
              <div className="ai-chat-message-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              </div>
              {msg.attachments && msg.attachments.length > 0 && <FileAttachments attachments={msg.attachments} />}
            </div>
          )}
          {isAssistant && msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="ai-chat-message-tools">
              {msg.toolCalls.map((tc, i) => <ToolCard key={i} tc={tc} />)}
            </div>
          )}
          {isAssistant && <MessageActions text={msg.content} />}
        </div>
        {isUser && (
          <div className="ai-chat-avatar ai-chat-avatar-user">
            <span className="ai-chat-avatar-text">You</span>
          </div>
        )}
      </div>
    </div>
  );
});

// ── Thinking Message ──
export function ThinkingMessage({ streamingText, toolCalls }: {
  streamingText: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
}) {
  return (
    <div className="ai-chat-message" data-testid="message-assistant-loading">
      <div className="ai-chat-message-row ai-chat-message-row-assistant">
        <div className="ai-chat-avatar">
          <SparklesIcon size={13} />
        </div>
        <div className="ai-chat-message-content">
          {!streamingText && (
            <div className="ai-chat-thinking-indicator">
              <Shimmer className="font-medium">Waiting for response...</Shimmer>
            </div>
          )}
          {streamingText && (
            <div className="ai-chat-message-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {streamingText}
              </ReactMarkdown>
              <span className="ai-chat-streaming-cursor" />
            </div>
          )}
          {toolCalls.length > 0 && (
            <div className="ai-chat-message-tools">
              {toolCalls.map((tc, i) => <ToolCard key={i} tc={tc} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
