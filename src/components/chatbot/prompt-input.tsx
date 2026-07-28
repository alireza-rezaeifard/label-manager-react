// PromptInput — Vercel-style composer
import { useRef, useEffect, useCallback, type FormEvent } from 'react';
import { ArrowUpIcon, StopIcon } from './icons';

export function PromptInput({
  input,
  onInputChange,
  onSubmit,
  onStop,
  status,
  placeholder,
  disabled,
}: {
  input: string;
  onInputChange: (val: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  status: 'ready' | 'streaming' | 'error';
  placeholder?: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, []);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (status === 'streaming') {
      onStop();
    } else {
      onSubmit();
    }
  }, [status, onSubmit, onStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (status === 'streaming') onStop();
      else if (input.trim() && !disabled) onSubmit();
    }
  }, [status, input, disabled, onSubmit, onStop]);

  const isGenerating = status === 'streaming';

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <div className="prompt-box">
        <textarea
          ref={textareaRef}
          className="prompt-textarea"
          value={input}
          onChange={e => { onInputChange(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Ask anything...'}
          rows={1}
          disabled={disabled}
        />
        <div className="prompt-footer">
          <div className="prompt-tools" />
          <button
            type={isGenerating ? 'button' : 'submit'}
            className={`prompt-submit ${input.trim() && !disabled && !isGenerating ? 'prompt-submit--active' : ''} ${isGenerating ? 'prompt-submit--stop' : ''}`}
            disabled={!isGenerating && (!input.trim() || disabled)}
            onClick={isGenerating ? onStop : undefined}
            aria-label={isGenerating ? 'Stop' : 'Send'}
          >
            {isGenerating ? <StopIcon size={14} /> : <ArrowUpIcon size={14} />}
          </button>
        </div>
      </div>
    </form>
  );
}
