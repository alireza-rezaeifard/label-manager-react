import { useEffect, useRef, useState } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts a displayed figure up on mount and when the target changes; respects reduced motion. */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    if (reducedMotion()) {
      const id = requestAnimationFrame(() => {
        setValue(target);
        fromRef.current = target;
      });
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
