import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import type { ToastType } from '../types';

// Backward-compatible wrapper: routes existing addToast() calls through Sonner.
// The old Toast.tsx component is no longer rendered — Sonner's <Toaster /> in
// main.tsx handles the UI. The `toasts` array and `removeToast` are kept as
// no-ops so callers don't break, but they are effectively unused now.
export function useToast() {
  const addToast = useCallback((message: string, type: ToastType['type'] = 'success', _duration = 3000) => {
    if (type === 'success') {
      sonnerToast.success(message);
    } else if (type === 'error') {
      sonnerToast.error(message);
    } else if (type === 'warning') {
      sonnerToast.warning(message);
    } else if (type === 'info') {
      sonnerToast.info(message);
    } else {
      sonnerToast(message);
    }
  }, []);

  const removeToast = useCallback((_id: number) => {
    // Sonner manages its own dismissals; no-op for compatibility
  }, []);

  return { toasts: [] as ToastType[], addToast, removeToast };
}
