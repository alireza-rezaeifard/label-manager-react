// Lightweight Message components — no streamdown deps
import { type ReactNode, memo } from 'react';
import { SparklesIcon, CopyIcon } from './icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

// Message wrapper
export function Message({ from, children, className = '' }: {
  from: 'user' | 'assistant';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`message ${from === 'user' ? 'message--user' : 'message--assistant'} ${className}`}>
      <div className={`message-row ${from === 'user' ? 'message-row--user' : 'message-row--assistant'}`}>
        {from === 'assistant' && (
          <div className="message-avatar">
            <SparklesIcon size={13} />
          </div>
        )}
        <div className="message-content">{children}</div>
        {from === 'user' && (
          <div className="message-avatar message-avatar--user">
            <span className="message-avatar-text">You</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Message content wrapper
export function MessageContent({ children, className = '' }: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`message-text ${className}`}>{children}</div>;
}

// Message response — renders markdown with code blocks
export const MessageResponse = memo(function MessageResponse({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: cls, children: codeChildren, ...props }) {
            const match = /language-(\w+)/.exec(cls || '');
            const code = String(codeChildren).replace(/\n$/, '');
            if (match) {
              return <CodeBlock language={match[1]} code={code} />;
            }
            return <code className="inline-code" {...props}>{codeChildren}</code>;
          },
          p({ children: pChildren, ...props }) { return <p className="md-p" {...props}>{pChildren}</p>; },
          ul({ children: uChildren, ...props }) { return <ul className="md-list" {...props}>{uChildren}</ul>; },
          ol({ children: oChildren, ...props }) { return <ol className="md-list md-list--ol" {...props}>{oChildren}</ol>; },
          li({ children: lChildren, ...props }) { return <li className="md-li" {...props}>{lChildren}</li>; },
          h1({ children: hChildren, ...props }) { return <h1 className="md-h1" {...props}>{hChildren}</h1>; },
          h2({ children: hChildren, ...props }) { return <h2 className="md-h2" {...props}>{hChildren}</h2>; },
          h3({ children: hChildren, ...props }) { return <h3 className="md-h3" {...props}>{hChildren}</h3>; },
          table({ children: tChildren, ...props }) {
            return <div className="md-table-wrap"><table className="md-table" {...props}>{tChildren}</table></div>;
          },
          th({ children: thChildren, ...props }) { return <th className="md-th" {...props}>{thChildren}</th>; },
          td({ children: tdChildren, ...props }) { return <td className="md-td" {...props}>{tdChildren}</td>; },
          blockquote({ children: bChildren, ...props }) { return <blockquote className="md-blockquote" {...props}>{bChildren}</blockquote>; },
          a({ href, children: aChildren, ...props }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="md-link" {...props}>{aChildren}</a>; },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});

// Message actions — copy button shown on hover
export function MessageActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`message-actions ${className}`}>{children}</div>;
}

// Message action button
export function MessageAction({
  onClick,
  tooltip,
  disabled,
  children,
  className = '',
}: {
  onClick?: () => void;
  tooltip?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`message-action-btn ${className}`}
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

// Copy action
export function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <MessageAction onClick={handleCopy} tooltip="Copy">
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
    </MessageAction>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg height={size} width={size} viewBox="0 0 16 16" style={{ color: 'currentcolor' }}>
      <path clipRule="evenodd" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

// Code block with copy
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language}</span>
        <button onClick={handleCopy} className="code-block-copy" type="button" aria-label="Copy code">
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
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
