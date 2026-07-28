// Lightweight Tool component — no shadcn deps
import { useState, type ReactNode } from 'react';
import { WrenchIcon, ChevronDownIcon, CheckCircle2Icon, XCircleIcon, ClockIcon } from './icons';

export function Tool({ children, className = '', defaultOpen = false }: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`tool ${open ? 'tool--open' : ''} ${className}`}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
    </div>
  );
}

export function ToolHeader({
  type,
  state,
  toolName,
  className = '',
}: {
  type: string;
  state: string;
  toolName?: string;
  className?: string;
}) {
  const name = type === 'dynamic-tool' ? toolName : type.replace(/^tool-/, '');
  const statusMap: Record<string, { icon: ReactNode; label: string; color: string }> = {
    'input-streaming': { icon: <ClockIcon size={12} />, label: 'Pending', color: '#888' },
    'input-available': { icon: <ClockIcon size={12} />, label: 'Running', color: '#888' },
    'output-available': { icon: <CheckCircle2Icon size={12} />, label: 'Done', color: '#16a34a' },
    'output-error': { icon: <XCircleIcon size={12} />, label: 'Error', color: '#dc2626' },
    'approval-requested': { icon: <ClockIcon size={12} />, label: 'Awaiting', color: '#eab308' },
    'output-denied': { icon: <XCircleIcon size={12} />, label: 'Denied', color: '#f97316' },
  };
  const status = statusMap[state] || statusMap['input-streaming'];

  return (
    <div className={`tool-header ${className}`}>
      <div className="tool-header-left">
        <WrenchIcon size={14} />
        <span className="tool-name">{name}</span>
        <span className="tool-badge" style={{ color: status.color }}>
          {status.icon}
          {status.label}
        </span>
      </div>
      <ChevronDownIcon size={14} />
    </div>
  );
}

export function ToolContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`tool-body ${className}`}>{children}</div>;
}

export function ToolInput({ input }: { input: unknown }) {
  return (
    <div className="tool-section">
      <h4 className="tool-section-title">Parameters</h4>
      <pre className="tool-code">{JSON.stringify(input, null, 2)}</pre>
    </div>
  );
}

export function ToolOutput({ output, errorText }: { output: ReactNode; errorText?: string }) {
  if (!output && !errorText) return null;
  return (
    <div className="tool-section">
      <h4 className="tool-section-title">{errorText ? 'Error' : 'Result'}</h4>
      <div className="tool-code-wrap">
        {errorText && <div style={{ color: '#dc2626', marginBottom: 8 }}>{errorText}</div>}
        <div>{typeof output === 'string' ? <pre className="tool-code">{output}</pre> : output}</div>
      </div>
    </div>
  );
}
