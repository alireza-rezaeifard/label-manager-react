// ThinkingMessage — streaming placeholder
import { SparklesIcon } from './icons';
import { Shimmer } from './shimmer';

export function ThinkingMessage({ streamingText }: { streamingText: string }) {
  return (
    <div className="message message--assistant" data-testid="message-assistant-loading">
      <div className="message-row message-row--assistant">
        <div className="message-avatar">
          <SparklesIcon size={13} />
        </div>
        <div className="message-content">
          {!streamingText && (
            <div className="thinking-indicator">
              <Shimmer className="shimmer-text">Waiting for response...</Shimmer>
            </div>
          )}
          {streamingText && (
            <div className="message-text streaming">
              <span className="streaming-text">{streamingText}</span>
              <span className="streaming-cursor" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
