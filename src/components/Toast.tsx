/**
 * Legacy Toast component — now a no-op.
 * Toasts are rendered by Sonner's <Toaster /> in main.tsx.
 * Kept for backward compatibility with App.tsx which still renders <Toast />.
 */
export default function Toast(_props: {
  toasts: any[];
  onRemove: (id: number) => void;
}) {
  return null;
}
