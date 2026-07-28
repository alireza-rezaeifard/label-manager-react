import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ShimmerProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export function Shimmer({
  children,
  as: Component = 'p',
  className = '',
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (
    <motion.span
      animate={{ backgroundPosition: '0% center' }}
      className={`relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent ${className}`}
      initial={{ backgroundPosition: '100% center' }}
      style={{
        '--spread': `${dynamicSpread}px`,
        backgroundImage:
          'var(--bg, linear-gradient(90deg, #0000 calc(50% - var(--spread)), var(--color-foreground, #171717), #0000 calc(50% + var(--spread)))), linear-gradient(var(--color-muted-foreground, #737373), var(--color-muted-foreground, #737373))',
      } as React.CSSProperties}
      transition={{
        duration,
        ease: 'linear',
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </motion.span>
  );
}
