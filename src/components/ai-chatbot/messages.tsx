import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowDownIcon } from './icons';
import { Greeting } from './greeting';
import { PreviewMessage, ThinkingMessage } from './message';
import type { AIChatMessage } from '../../types';

interface MessagesProps {
  messages: AIChatMessage[];
  streaming: boolean;
  streamingText: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
  isAtBottom: boolean;
  onScroll: () => void;
}

export function Messages({
  messages,
  streaming,
  streamingText,
  toolCalls,
  isAtBottom,
  onScroll,
}: MessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    }
  }, [messages, streamingText, scrollToBottom, isAtBottom]);

  return (
    <div className="ai-chat-messages">
      {messages.length === 0 && !streaming && (
        <div className="ai-chat-messages-empty">
          <Greeting />
        </div>
      )}
      <div
        className="ai-chat-messages-scroll"
        ref={containerRef}
        onScroll={onScroll}
      >
        <div className="ai-chat-messages-inner">
          {messages.map((msg, i) => (
            <PreviewMessage
              key={msg.id}
              msg={msg}
              isLoading={false}
            />
          ))}

          {streaming && (
            <ThinkingMessage streamingText={streamingText} toolCalls={toolCalls} />
          )}

          <div ref={endRef} className="ai-chat-messages-end" />
        </div>
      </div>

      <button
        className={`ai-chat-scroll-to-bottom ${isAtBottom ? 'ai-chat-scroll-to-bottom-hidden' : ''}`}
        onClick={() => scrollToBottom(true)}
        type="button"
        aria-label="Scroll to bottom"
      >
        <ArrowDownIcon size={14} />
      </button>
    </div>
  );
}
