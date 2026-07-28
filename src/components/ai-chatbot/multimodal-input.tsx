import React, { useRef, useEffect, useCallback } from 'react';
import { ArrowUpIcon, StopIcon } from './icons';
import { SuggestedActions } from './suggested-actions';

interface MultimodalInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  messagesEmpty: boolean;
}

export function MultimodalInput({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder = 'Ask anything...',
  messagesEmpty,
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && !isStreaming) {
      textareaRef.current?.focus();
    }
  }, [disabled, isStreaming]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [setInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) onStop();
      else if (input.trim()) onSend();
    }
  }, [isStreaming, onStop, onSend, input]);

  const handleSubmit = useCallback(() => {
    if (isStreaming) {
      onStop();
    } else if (input.trim()) {
      onSend();
    }
  }, [isStreaming, onStop, onSend, input]);

  const handleSuggestionSelect = useCallback((text: string) => {
    setInput(text);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [setInput]);

  const isActive = input.trim() && !disabled;

  return (
    <div className="ai-chat-input-wrapper">
      {!isStreaming && messagesEmpty && (
        <SuggestedActions onSelect={handleSuggestionSelect} />
      )}

      <div className="ai-chat-input-container">
        <div className="ai-chat-input-box">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Set up AI provider first...' : placeholder}
            rows={1}
            disabled={disabled}
            className="ai-chat-input-textarea"
          />
          <div className="ai-chat-input-footer">
            <div className="ai-chat-input-tools" />
            <button
              onClick={handleSubmit}
              disabled={!isStreaming && !isActive}
              className={`ai-chat-input-submit ${isStreaming ? 'ai-chat-input-submit-stop' : ''} ${isActive ? 'ai-chat-input-submit-active' : ''}`}
              type="button"
              aria-label={isStreaming ? 'Stop' : 'Send'}
            >
              {isStreaming ? <StopIcon size={14} /> : <ArrowUpIcon size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
