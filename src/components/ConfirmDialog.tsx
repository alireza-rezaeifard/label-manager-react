import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function ConfirmDialog({
  show, title, message, confirmLabel = 'تایید', cancelLabel = 'انصراف',
  variant = 'primary', loading = false, icon, onConfirm, onCancel,
}: {
  show: boolean; title: string; message: string;
  confirmLabel?: string; cancelLabel?: string;
  variant?: 'primary' | 'danger'; loading?: boolean; icon?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="m-0 text-lg font-semibold">{title}</h3>
              <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none">
                <X className="h-5 w-5" />
              </button>
            </div>

            {icon && (
              <div className="mb-4 flex justify-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(15, 118, 110, 0.1)',
                    color: variant === 'danger' ? 'var(--danger)' : 'var(--primary)',
                  }}
                >
                  {variant === 'danger' ? (
                    <AlertTriangle className="h-8 w-8" />
                  ) : (
                    <i className={`ti ${icon} text-3xl`} />
                  )}
                </div>
              </div>
            )}

            <p className="mb-6 leading-relaxed opacity-70">{message}</p>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant={variant === 'danger' ? 'destructive' : 'default'}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
