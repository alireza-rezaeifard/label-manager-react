import { memo, useState } from 'react';
import { FileText, FileSpreadsheet, FileCode, File as FileIcon, Eye, Download, AlertTriangle, Loader2 } from 'lucide-react';
import type { ArtifactMeta } from '../types';

const TYPE_META: Record<string, { icon: typeof FileIcon; label: string; color: string }> = {
  pdf: { icon: FileText, label: 'PDF', color: '#dc2626' },
  csv: { icon: FileSpreadsheet, label: 'CSV', color: '#16a34a' },
  xlsx: { icon: FileSpreadsheet, label: 'Excel', color: '#15803d' },
  json: { icon: FileCode, label: 'JSON', color: '#0e7490' },
  txt: { icon: FileIcon, label: 'متن', color: '#6b7280' },
  md: { icon: FileIcon, label: 'Markdown', color: '#7c3aed' },
  file: { icon: FileIcon, label: 'فایل', color: '#6b7280' },
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} KB`;
}

/**
 * Downloadable AI-generated file. Metadata only — the binary lives
 * server-side behind a workspace-authorized endpoint.
 */
const ArtifactCard = memo(function ArtifactCard({ artifact }: { artifact: ArtifactMeta }) {
  const meta = TYPE_META[artifact.type] || TYPE_META.file;
  const Icon = meta.icon;
  const [failed, setFailed] = useState(false);

  const handleView = () => {
    window.open(`${artifact.url}?inline=1`, '_blank', 'noopener');
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(artifact.url + '/download', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = artifact.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 4000);
    }
  };

  return (
    <div className="aiw-artifact">
      <span className="aiw-artifact-icon" style={{ background: `${meta.color}14`, color: meta.color }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="aiw-artifact-info">
        <span className="aiw-artifact-filename" title={artifact.filename} dir="auto">{artifact.filename}</span>
        <span className="aiw-artifact-meta">{meta.label} · {formatSize(artifact.size)}</span>
        {failed && (
          <span className="aiw-artifact-error"><AlertTriangle className="h-3 w-3" /> دانلود ناموفق بود — دوباره تلاش کنید</span>
        )}
      </div>
      <div className="aiw-artifact-actions">
        <button type="button" className="ds-btn ds-btn--sm" onClick={handleView} title="نمایش فایل">
          <Eye className="h-3.5 w-3.5" /> مشاهده
        </button>
        <button type="button" className="ds-btn ds-btn--sm ds-btn--primary" onClick={handleDownload} title="دانلود فایل">
          <Download className="h-3.5 w-3.5" /> دانلود
        </button>
      </div>
    </div>
  );
});

/** Inline status shown while Hermes is preparing a file. */
export const ArtifactGenerating = memo(function ArtifactGenerating({ label = 'در حال ساخت گزارش PDF...' }: { label?: string }) {
  return (
    <div className="aiw-artifact aiw-artifact--pending" role="status">
      <span className="aiw-artifact-icon aiw-artifact-icon--pending"><Loader2 className="h-5 w-5 animate-spin" /></span>
      <div className="aiw-artifact-info">
        <span className="aiw-artifact-filename">{label}</span>
        <span className="aiw-artifact-meta">هرمس در حال آمادهسازی فایل است</span>
      </div>
    </div>
  );
});

/** Inline failure state with retry. */
export const ArtifactFailed = memo(function ArtifactFailed({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="aiw-artifact aiw-artifact--failed" role="alert">
      <span className="aiw-artifact-icon aiw-artifact-icon--failed"><AlertTriangle className="h-5 w-5" /></span>
      <div className="aiw-artifact-info">
        <span className="aiw-artifact-filename">ساخت فایل ناموفق بود</span>
        <span className="aiw-artifact-meta">متن پاسخ حفظ شده است</span>
      </div>
      {onRetry && (
        <button type="button" className="ds-btn ds-btn--sm" onClick={onRetry}>تلاش مجدد</button>
      )}
    </div>
  );
});

export default memo(ArtifactCard);
