// Lightweight Shimmer — no framer-motion dependency
import { memo } from 'react';

export const Shimmer = memo(function Shimmer({
  children,
  className,
  duration = 2,
}: {
  children: string;
  className?: string;
  duration?: number;
}) {
  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: `shimmer ${duration}s linear infinite`,
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
});
