// ScrollToBottom — auto-scroll button
import { ArrowDownIcon } from './icons';

export function ScrollToBottom({
  isAtBottom,
  onClick,
}: {
  isAtBottom: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`scroll-to-bottom ${isAtBottom ? 'scroll-to-bottom--hidden' : ''}`}
      onClick={onClick}
      type="button"
      aria-label="Scroll to bottom"
    >
      <ArrowDownIcon size={14} />
    </button>
  );
}
