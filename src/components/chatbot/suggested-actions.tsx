// SuggestedActions — clickable suggestion cards
import { memo, useCallback } from 'react';

export const SuggestedActions = memo(function SuggestedActions({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  const suggestions = [
    { text: 'Show project structure', icon: '📂' },
    { text: 'Create a new component', icon: '⚛️' },
    { text: 'Run the test suite', icon: '🧪' },
    { text: 'Check git status', icon: '📊' },
    { text: 'Search records', icon: '🔍' },
    { text: 'Inspect the database', icon: '💾' },
  ];

  return (
    <div className="suggested-actions">
      {suggestions.map((s, i) => (
        <div key={s.text} className="suggested-action" style={{ animationDelay: `${0.06 * i}s` }}>
          <button className="suggested-action-btn" onClick={() => onSelect(s.text)} type="button">
            <span className="suggested-action-icon">{s.icon}</span>
            <span className="suggested-action-text">{s.text}</span>
          </button>
        </div>
      ))}
    </div>
  );
});
