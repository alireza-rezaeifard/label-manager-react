import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode } from '@/components/ui/qr-code';
import { X, Eye, Pencil, Star, CheckSquare, Square } from 'lucide-react';
import { formatAmount } from '../../utils/formatters';
import { faNum, relativeTime, formatStampDate, enabledFields } from './shared';
import type { RecordItem, CustomField } from '../../types';

interface LabelDetailDrawerProps {
  record: RecordItem | null;
  index: number | null;
  selected: boolean;
  isFavorite: boolean;
  customFields: CustomField[];
  enabledCustomFieldKeys: string[];
  relatedRecords: RecordItem[];
  isMobileSheet: boolean;
  isViewer: boolean;
  onClose: () => void;
  onToggleSelect: (index: number) => void;
  onView: (index: number) => void;
  onEdit: (index: number) => void;
  onOpenRelated: (code: string) => void;
  onToggleFavorite?: (index: number) => void;
}

export default function LabelDetailDrawer({
  record, index, selected, isFavorite,
  customFields, enabledCustomFieldKeys,
  relatedRecords, isMobileSheet, isViewer,
  onClose, onToggleSelect, onView, onEdit, onOpenRelated, onToggleFavorite,
}: LabelDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (record && closeRef.current) {
      closeRef.current.focus();
    }
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler);
  }, [record, onClose]);

  const visibleCustoms = record
    ? enabledFields(customFields, enabledCustomFieldKeys).filter(f => {
        const v = (record as Record<string, unknown>)[f.key];
        return v !== undefined && v !== null && String(v).trim() !== '';
      })
    : [];

  const sealChar = (() => {
    if (!record) return '؟';
    const src = (record.project || record.type || '').trim();
    const ch = [...src][0];
    return ch || '؟';
  })();

  const hasIndex = index !== null;

  return (
    <AnimatePresence>
      {record && (
        <motion.div
          key="lbx-drawer-overlay"
          className="modal-overlay lbx-drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`جزئیات برچسب ${record.code}`}
            className={`lbx-drawer${isMobileSheet ? ' lbx-drawer-sheet' : ''}`}
            initial={isMobileSheet ? { y: 90, opacity: 0 } : { x: -36, opacity: 0 }}
            animate={isMobileSheet ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={isMobileSheet ? { y: 90, opacity: 0 } : { x: -36, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="lbx-drawer-head">
              <div className="ds-seal ds-seal--sm" aria-hidden="true">
                {sealChar}
                <span className="ds-seal-halo" />
              </div>
              <div className="lbx-drawer-id">
                <span className="code-badge">{record.code}</span>
                <span className="lbx-drawer-sub">
                  {record.project || '—'} · {record.type || '—'}
                </span>
              </div>
              {onToggleFavorite && hasIndex && (
                <button
                  type="button"
                  className="lbx-star lbx-star-lg"
                  onClick={() => onToggleFavorite?.(index!)}
                  aria-label={isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                >
                  <Star size={17} fill={isFavorite ? 'var(--warning)' : 'none'} color={isFavorite ? 'var(--warning)' : 'var(--text-color)'} opacity={isFavorite ? 1 : 0.35} />
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                className="lbx-close-btn"
                onClick={onClose}
                aria-label="بستن جزئیات"
              >
                <X size={17} />
              </button>
            </div>

            <div className="lbx-drawer-scroll">
              <div className="lbx-sticker">
                <QrCode value={record.code} size={112} bgColor="#ffffff" fgColor="#111111" />
                <div className="lbx-sticker-info">
                  <span className="lbx-sticker-title">برچسب چاپی</span>
                  <span className="lbx-sticker-hint">این کد به‌صورت QR روی برچسب چاپ می‌شود.</span>
                </div>
              </div>

              <div className="lbx-kvlist">
                <div className="ds-kv">
                  <span className="ds-kv-label">مبلغ</span>
                  <span className="ds-kv-value lbx-kv-amount" dir="ltr">{formatAmount(record.amount) || '—'}</span>
                </div>
                <div className="ds-kv">
                  <span className="ds-kv-label">پروژه</span>
                  <span className="ds-kv-value">{record.project || '—'}</span>
                </div>
                <div className="ds-kv">
                  <span className="ds-kv-label">نوع</span>
                  <span className="ds-kv-value">{record.type || '—'}</span>
                </div>
                <div className="ds-kv">
                  <span className="ds-kv-label">تاریخ سند</span>
                  <span className="ds-kv-value" dir="ltr">{record.date || '—'}</span>
                </div>
                <div className="ds-kv">
                  <span className="ds-kv-label">طرف حساب</span>
                  <span className="ds-kv-value">{record.party || '—'}</span>
                </div>
                {visibleCustoms.map(f => (
                  <div key={f.key} className="ds-kv">
                    <span className="ds-kv-label">{f.fa}</span>
                    <span className="ds-kv-value" dir="auto">{String((record as Record<string, unknown>)[f.key])}</span>
                  </div>
                ))}
                {record.locked_by && (
                  <div className="ds-kv">
                    <span className="ds-kv-label">قفل شده توسط</span>
                    <span className="ds-kv-value">{record.locked_by}</span>
                  </div>
                )}
                {record.created_at && (
                  <div className="ds-kv">
                    <span className="ds-kv-label">ایجاد</span>
                    <span className="ds-kv-value">{formatStampDate(record.created_at)}</span>
                  </div>
                )}
                {record.updated_at && (
                  <div className="ds-kv">
                    <span className="ds-kv-label">آخرین تغییر</span>
                    <span className="ds-kv-value">{relativeTime(record.updated_at)}</span>
                  </div>
                )}
              </div>

              {record.tags && record.tags.length > 0 && (
                <section className="lbx-drawer-section">
                  <div className="lbx-section-cap">برچسب‌ها</div>
                  <div className="lbx-tags-row">
                    {record.tags.map(tag => (
                      <span key={tag} className="lbx-tag">{tag}</span>
                    ))}
                  </div>
                </section>
              )}

              {relatedRecords.length > 0 && (
                <section className="lbx-drawer-section">
                  <div className="lbx-section-cap">برچسب‌های مرتبط ({faNum(relatedRecords.length)})</div>
                  <div className="lbx-rel-list">
                    {relatedRecords.map(rel => (
                      <button
                        type="button"
                        key={rel.code}
                        className="lbx-rel-item"
                        onClick={() => onOpenRelated(rel.code)}
                      >
                        <span className="code-badge lbx-rel-code">{rel.code}</span>
                        <span className="lbx-rel-proj">{rel.project || rel.type || ''}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {record.notes && (
                <section className="lbx-drawer-section">
                  <div className="lbx-section-cap">یادداشت</div>
                  <p className="lbx-notes-text">{record.notes}</p>
                </section>
              )}
            </div>

            <div className="lbx-drawer-foot">
              <button
                type="button"
                disabled={!hasIndex}
                className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-outline'} lbx-foot-btn`}
                onClick={() => hasIndex && onToggleSelect(index)}
              >
                {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                {selected ? 'انتخاب‌شده برای چاپ' : 'انتخاب برای چاپ'}
              </button>
              <button
                type="button"
                disabled={!hasIndex}
                className="btn btn-outline btn-sm lbx-foot-btn"
                onClick={() => hasIndex && onView(index)}
              >
                <Eye size={14} /> مشاهده کامل
              </button>
              {!isViewer && (
                <button
                  type="button"
                  disabled={!hasIndex}
                  className="btn btn-outline btn-sm lbx-foot-icon"
                  onClick={() => hasIndex && onEdit(index)}
                  aria-label="ویرایش رکورد"
                  title="ویرایش"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
