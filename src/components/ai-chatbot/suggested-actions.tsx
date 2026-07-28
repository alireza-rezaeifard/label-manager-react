import React from 'react';
import { motion } from 'framer-motion';

interface SuggestedActionsProps {
  onSelect: (text: string) => void;
}

const suggestions = [
  { text: 'Explain how taxes work', icon: '💡' },
  { text: 'Help me with a formula', icon: '🔢' },
  { text: 'Summarize recent records', icon: '📊' },
  { text: 'Generate a report', icon: '📄' },
  { text: 'Search for a record', icon: '🔍' },
  { text: 'Best practices for accounting', icon: '📚' },
];

export function SuggestedActions({ onSelect }: SuggestedActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 w-full max-w-[560px]">
      {suggestions.map((s, i) => (
        <motion.button
          key={s.text}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 w-full rounded-xl border border-border/60 bg-card/70 px-4 py-3.5 text-left text-[13px] text-foreground shadow-[var(--shadow-card)] backdrop-blur-sm transition-all duration-200 hover:bg-accent/50 hover:border-border hover:shadow-md hover:-translate-y-px cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          onClick={() => onSelect(s.text)}
          transition={{
            delay: 0.1 + 0.05 * i,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          type="button"
        >
          <span className="text-base flex-shrink-0">{s.icon}</span>
          <span className="leading-snug">{s.text}</span>
        </motion.button>
      ))}
    </div>
  );
}
