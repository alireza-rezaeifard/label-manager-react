import React, { useRef, useEffect, useCallback } from 'react';
import { Paperclip, X } from 'lucide-react';
import { ArrowUpIcon, StopIcon } from './icons';
import { SuggestedActions } from './suggested-actions';
import type { ChatAttachment } from '../../types';

interface MultimodalInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  messagesEmpty: boolean;
  attachments?: ChatAttachment[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
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
  attachments = [],
  onAttachFiles,
  onRemoveAttachment,
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length && onAttachFiles) onAttachFiles(files);
    e.target.value = '';
  }, [onAttachFiles]);

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
          {attachments.length > 0 && (
            <div className="ai-chat-input-attachments">
              {attachments.map((a) => (
                <span key={a.id} className="ai-chat-input-chip">
                  <span className="ai-chat-input-chip-name">{a.name}</span>
                  {onRemoveAttachment && (
                    <button type="button" className="ai-chat-input-chip-remove" onClick={() => onRemoveAttachment(a.id)} aria-label="Remove file">
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="ai-chat-input-footer">
            <div className="ai-chat-input-tools">
              {onAttachFiles && !isStreaming && (
                <>
                  <input ref={fileInputRef} type="file" multiple hidden onChange={handleFiles} />
                  <button type="button" className="ai-chat-input-attach" onClick={() => fileInputRef.current?.click()} title="Attach file" aria-label="Attach file">
                    <Paperclip size={15} />
                  </button>
                </>
              )}
            </div>
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
