import { useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog';
import {
  convertWithAIAgent, convertHeuristic, generateTaxBookExcel, getPreviewData, TAX_BOOK_HEADERS,
} from '../utils/taxBookExport';
import type { RecordItem, FieldDef, CustomField, TaxBookEntry } from '../types';
import { FileSpreadsheet, Bot, Loader2, Zap, Download, RotateCcw, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  allRecords: RecordItem[];
  selectedRecords: RecordItem[];
  sortedRecords: RecordItem[];
  customFields: CustomField[];
  enabledCustomFieldKeys: string[];
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type Step = 'config' | 'processing' | 'result' | 'error';

export default function TaxBookExportModal({
  open, onClose, allRecords, selectedRecords, sortedRecords,
  customFields, enabledCustomFieldKeys, aiApiUrl, aiApiKey, aiModel, addToast,
}: Props) {
  const [step, setStep] = useState<Step>('config');
  const [scope, setScope] = useState<'selected' | 'all'>('selected');
  const [entries, setEntries] = useState<TaxBookEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState('');

  const enabledCustomFields = useMemo(
    () => customFields.filter(f => enabledCustomFieldKeys.includes(f.key)),
    [customFields, enabledCustomFieldKeys],
  );

  const fieldDefs = useMemo((): FieldDef[] => [
    { key: 'code', label: 'Code', fa: 'کد' },
    { key: 'project', label: 'Project', fa: 'پروژه' },
    { key: 'type', label: 'Type', fa: 'نوع' },
    { key: 'date', label: 'Date', fa: 'تاریخ' },
    { key: 'party', label: 'Party', fa: 'طرف حساب' },
    { key: 'amount', label: 'Amount', fa: 'مبلغ' },
    { key: 'related', label: 'Related', fa: 'مرتبط', isRelated: true },
  ], []);

  const targetRecords = useMemo(() => {
    if (scope === 'selected' && selectedRecords.length > 0) {
      return sortedRecords.filter(r => selectedRecords.includes(r));
    }
    return sortedRecords;
  }, [scope, selectedRecords, sortedRecords]);

  const previewData = useMemo(() => {
    if (entries.length === 0) return [];
    return getPreviewData(entries, 10);
  }, [entries]);

  const totalDebit = useMemo(() => entries.reduce((s, e) => s + e.debit, 0), [entries]);
  const totalCredit = useMemo(() => entries.reduce((s, e) => s + e.credit, 0), [entries]);

  const handleConvert = useCallback(async () => {
    if (targetRecords.length === 0) {
      addToast('هیچ رکوردی برای تبدیل وجود ندارد', 'error');
      return;
    }

    setStep('processing');
    setProgress('در حال تحلیل رکوردها...');

    try {
      let result: TaxBookEntry[];

      if (aiApiUrl && aiApiKey && aiModel) {
        setProgress('در حال ارسال به عامل هوش مصنوعی...');
        result = await convertWithAIAgent(
          targetRecords, fieldDefs, enabledCustomFields, aiApiUrl, aiApiKey, aiModel,
        );
      } else {
        setProgress('در حال تبدیل با روش خودکار...');
        // Small delay to show the progress
        await new Promise(r => setTimeout(r, 500));
        result = convertHeuristic(targetRecords, fieldDefs, enabledCustomFields);
      }

      if (result.length === 0) {
        throw new Error('نتیجه‌ای تولید نشد');
      }

      setEntries(result);
      setStep('result');
      addToast(`${result.length} سطر دفتر روزنامه تولید شد`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
      setErrorMessage(msg);
      setStep('error');
      addToast('خطا در تبدیل: ' + msg, 'error');
    }
  }, [targetRecords, fieldDefs, enabledCustomFields, aiApiUrl, aiApiKey, aiModel, addToast]);

  const handleDownload = useCallback(() => {
    if (entries.length === 0) return;
    generateTaxBookExcel(entries);
    addToast('فایل اکسل دانلود شد', 'success');
  }, [entries, addToast]);

  const handleReset = useCallback(() => {
    setStep('config');
    setEntries([]);
    setErrorMessage('');
    setProgress('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <DialogHeader>
          <DialogTitle>
            <FileSpreadsheet className="inline h-5 w-5" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
            خروجی دفاتر قانونی الکترونیکی
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Config ── */}
        {step === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Scope selection */}
            <div style={{
              padding: '1rem', borderRadius: '10px',
              border: '1px solid var(--border-color)', background: 'var(--hover-bg)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                انتخاب رکوردها
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    disabled={selectedRecords.length === 0}
                  />
                  <span>رکوردهای انتخاب شده (<b>{selectedRecords.length}</b>)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                  />
                  <span>همه رکوردها (<b>{allRecords.length}</b>)</span>
                </label>
              </div>
            </div>

            {/* AI info */}
            <div style={{
              padding: '1rem', borderRadius: '10px',
              border: '1px solid var(--border-color)', background: 'var(--hover-bg)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot className="h-4 w-4" />
                عامل تبدیل
              </div>
              <p style={{ fontSize: '0.8125rem', opacity: 0.7, margin: 0, lineHeight: 1.6 }}>
                {aiApiUrl && aiApiKey && aiModel ? (
                  <>با استفاده از هوش مصنوعی، رکوردهای شما به صورت حرفه‌ای به قالب دفاتر قانونی تبدیل می‌شوند. کدهای حساب، عناوین و تقسیم بدهکار/بستانکار توسط هوش مصنوعی تعیین می‌شود.</>
                ) : (
                  <>هوش مصنوعی پیکربندی نشده است. تبدیل با روش خودکار انجام می‌شود. برای نتیجه بهتر، API هوش مصنوعی را در تنظیمات پیکربندی کنید.</>
                )}
              </p>
            </div>

            {/* Start button */}
            <button
              className="btn btn-primary"
              onClick={handleConvert}
              disabled={targetRecords.length === 0}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              {aiApiUrl && aiApiKey && aiModel ? <Bot className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              شروع تبدیل ({targetRecords.length} رکورد)
            </button>
          </div>
        )}

        {/* ── Step: Processing ── */}
        {step === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--primary)' }} />
            <div style={{ fontWeight: 600 }}>{progress}</div>
            <div style={{ fontSize: '0.8125rem', opacity: 0.5 }}>
              لطفا صبر کنید...
            </div>
          </div>
        )}

        {/* ── Step: Result ── */}
        {step === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem',
            }}>
              <div style={{
                padding: '0.75rem', borderRadius: '8px', textAlign: 'center',
                border: '1px solid var(--border-color)', background: 'var(--hover-bg)',
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{entries.length}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>سطر دفتر روزنامه</div>
              </div>
              <div style={{
                padding: '0.75rem', borderRadius: '8px', textAlign: 'center',
                border: '1px solid var(--border-color)', background: 'var(--hover-bg)',
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{totalDebit.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>بدهکار (ریال)</div>
              </div>
              <div style={{
                padding: '0.75rem', borderRadius: '8px', textAlign: 'center',
                border: '1px solid var(--border-color)', background: 'var(--hover-bg)',
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{totalCredit.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>بستانکار (ریال)</div>
              </div>
            </div>

            {/* Preview table */}
            <div style={{ overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' }}>
              <table className="import-preview-table" style={{ fontSize: '0.7rem', width: '100%' }}>
                <thead>
                  <tr>
                    {TAX_BOOK_HEADERS.map(h => (
                      <th key={h} style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {TAX_BOOK_HEADERS.map(h => (
                        <td key={h} style={{ whiteSpace: 'nowrap', textAlign: h.includes('مبلغ') ? 'left' : 'right' }}>
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries.length > 10 && (
              <div style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>
                نمایش ۱۰ ردیف از {entries.length} ردیف
              </div>
            )}
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
            <AlertCircle className="h-8 w-8" style={{ color: 'var(--danger)' }} />
            <div style={{ fontWeight: 600, color: 'var(--danger)' }}>خطا در تبدیل</div>
            <div style={{
              fontSize: '0.8125rem', opacity: 0.7, maxWidth: 500, width: '100%',
              background: 'var(--hover-bg)', padding: '1rem', borderRadius: 8,
              fontFamily: 'monospace', whiteSpace: 'pre-wrap', textAlign: 'left', direction: 'ltr',
            }}>
              {errorMessage}
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> تلاش مجدد
            </button>
          </div>
        )}

        <DialogFooter>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={handleClose}>
              بستن
            </button>
            {step === 'result' && (
              <>
                <button className="btn btn-outline btn-sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" /> تبدیل مجدد
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" /> دانلود اکسل
                </button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
