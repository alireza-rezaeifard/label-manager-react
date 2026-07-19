import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Download, Upload } from 'lucide-react';

export default function BackupModal({
  show, onClose,
  recordCount, onBackup,
  onRestore, setBackupFile,
  isViewer,
}: {
  show: boolean;
  onClose: () => void;
  recordCount: number;
  onBackup: () => void;
  onRestore: () => void;
  setBackupFile: React.Dispatch<React.SetStateAction<File | null>>;
  isViewer: boolean;
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="m-0 text-lg font-semibold">پشتیبانگیری و بازیابی</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <h4 className="mb-3 font-semibold">خروجی پشتیبان</h4>
          <p className="mb-4 text-sm opacity-70">
            {recordCount} رکورد برای پشتیبانگیری آماده است
          </p>
          <Button className="w-full" onClick={onBackup}>
            <Download className="h-4 w-4" /> دانلود پشتیبان (JSON)
          </Button>
        </div>

        {!isViewer && (
          <div className="border-t border-border pt-6">
            <h4 className="mb-3 font-semibold">بازیابی از پشتیبان</h4>
            <Input
              type="file"
              accept=".json"
              className="mb-4"
              onChange={e => setBackupFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="success" className="w-full" onClick={onRestore}>
              <Upload className="h-4 w-4" /> بازیابی
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
