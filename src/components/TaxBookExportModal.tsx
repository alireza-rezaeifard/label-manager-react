import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog';
import {
  convertWithAIAgent, convertHeuristic, generateTaxBookExcel, getPreviewData, TAX_BOOK_HEADERS,
} from '../utils/taxBookExport';
import type { RecordItem, FieldDef, CustomField, TaxBookEntry } from '../types';
import { FileSpreadsheet, Bot, Loader2, Zap, Download, RotateCcw, AlertCircle, Check } from 'lucide-react';

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
  aiCorsProxy: string;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type Step = 'config' | 'processing' | 'result' | 'error';

const STEP_LABELS: Record<Step, string> = {
  config: 'تنظیمات',
  processing: 'در حال پردازش',
  result: 'نتیجه',
  error: 'خطا',
};

const STEP_ORDER: Step[] = ['config', 'processing', 'result'];

export default function TaxBookExportModal({
  open, onClose, allRecords, selectedRecords, sortedRecords,
  customFields, enabledCustomFieldKeys, aiApiUrl, aiApiKey, aiModel, aiCorsProxy, addToast,
}: Props) {
  const [step, setStep] = useState<Step>('config');
  const [scope, setScope] = useState<'selected' | 'all'>('selected');
  const [entries, setEntries] = useState<TaxBookEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState('');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const currentStepIndex = STEP_ORDER.indexOf(step === 'error' ? 'config' : step);
  const aiEnabled = !!(aiApiUrl && aiApiKey && aiModel);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);

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
        result = await convertWithAIAgent(
          targetRecords, fieldDefs, enabledCustomFields, aiApiUrl, aiApiKey, aiModel, aiCorsProxy,
          (current, total, msg) => { setProgress(msg); setBatchProgress({ current, total }); },
        );
      } else {
        setProgress('در حال تبدیل با روش خودکار...');
        await new Promise(r => setTimeout(r, 300));
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
    setBatchProgress({ current: 0, total: 0 });
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-[640px] !p-0 !gap-0"
        dir="rtl"
        style={{
          maxHeight: 'min(90vh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-xl, 1rem)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <DialogHeader className="!px-6 !pt-6 !pb-4 !gap-0 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <DialogTitle className="!text-base !font-semibold !flex !items-center !gap-2.5 !m-0">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md, 0.5rem)',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
              }}
            >
              <FileSpreadsheet className="h-[18px] w-[18px]" />
            </div>
            <span>خروجی دفاتر قانونی الکترونیکی</span>
          </DialogTitle>

          {/* Step indicator */}
          {step !== 'error' && (
            <div className="flex items-center gap-1.5 mt-4">
              {STEP_ORDER.map((s, i) => {
                const isActive = i === currentStepIndex;
                const isDone = i < currentStepIndex;
                return (
                  <div key={s} className="flex items-center gap-1.5 flex-1">
                    <div
                      className="flex items-center justify-center shrink-0 transition-all duration-200"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: isDone
                          ? 'var(--primary)'
                          : isActive
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'var(--hover-bg)',
                        color: isDone
                          ? '#fff'
                          : isActive
                            ? 'var(--primary)'
                            : 'var(--text-color)',
                        opacity: isDone ? 1 : isActive ? 1 : 0.4,
                      }}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    {i < STEP_ORDER.length - 1 && (
                      <div
                        className="flex-1 h-0.5 rounded-full transition-colors duration-200"
                        style={{
                          background: i < currentStepIndex ? 'var(--primary)' : 'var(--border-color)',
                          opacity: i < currentStepIndex ? 0.5 : 0.3,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div
          ref={scrollRef}
          className="overflow-y-auto flex-1"
          style={{ minHeight: 0, padding: '1.25rem 1.5rem' }}
        >
          {/* ── Config Step ── */}
          {step === 'config' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Scope selection */}
              <fieldset
                className="rounded-xl p-4 transition-colors duration-200"
                style={{
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                }}
              >
                <legend
                  className="font-semibold text-sm px-2"
                  style={{ color: 'var(--text-color)' }}
                >
                  انتخاب رکوردها
                </legend>
                <div className="flex flex-col gap-3 mt-1">
                  <label
                    className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition-all duration-150"
                    style={{
                      background: scope === 'selected' ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                      border: `1px solid ${scope === 'selected' ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}`,
                    }}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'selected'}
                      onChange={() => setScope('selected')}
                      disabled={selectedRecords.length === 0}
                      className="accent-[var(--primary)] shrink-0"
                      style={{ width: 18, height: 18 }}
                    />
                    <span className="text-sm flex-1">
                      رکوردهای انتخاب شده
                      <span
                        className="inline-flex items-center justify-center mr-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          minWidth: 24,
                        }}
                      >
                        {selectedRecords.length}
                      </span>
                    </span>
                  </label>
                  <label
                    className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition-all duration-150"
                    style={{
                      background: scope === 'all' ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                      border: `1px solid ${scope === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}`,
                    }}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="accent-[var(--primary)] shrink-0"
                      style={{ width: 18, height: 18 }}
                    />
                    <span className="text-sm flex-1">
                      همه رکوردها
                      <span
                        className="inline-flex items-center justify-center mr-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: 'var(--hover-bg)',
                          color: 'var(--text-color)',
                          minWidth: 24,
                        }}
                      >
                        {allRecords.length}
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              {/* AI info card */}
              <div
                className="rounded-xl p-4 transition-colors duration-200"
                style={{
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      background: aiEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: aiEnabled ? 'var(--success)' : 'var(--warning)',
                    }}
                  >
                    {aiEnabled ? <Bot className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-color)' }}>
                    عامل تبدیل
                  </span>
                </div>
                <p
                  className="text-sm leading-relaxed m-0"
                  style={{ color: 'var(--text-color)', opacity: 0.6 }}
                >
                  {aiEnabled ? (
                    <>با استفاده از هوش مصنوعی، رکوردهای شما به صورت حرفه‌ای به قالب دفاتر قانونی تبدیل می‌شوند. کدهای حساب، عناوین و تقسیم بدهکار/بستانکار توسط هوش مصنوعی تعیین می‌شود.</>
                  ) : (
                    <>هوش مصنوعی پیکربندی نشده است. تبدیل با روش خودکار انجام می‌شود. برای نتیجه بهتر، API هوش مصنوعی را در تنظیمات پیکربندی کنید.</>
                  )}
                </p>
              </div>

              {/* Start button */}
              <button
                className="btn btn-primary flex items-center justify-center gap-2.5 w-full py-3 text-sm font-medium"
                onClick={handleConvert}
                disabled={targetRecords.length === 0}
                style={{
                  minHeight: 48,
                  opacity: targetRecords.length === 0 ? 0.5 : 1,
                  cursor: targetRecords.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {aiEnabled ? <Bot className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                <span>شروع تبدیل ({targetRecords.length} رکورد)</span>
              </button>
            </div>
          )}

          {/* ── Processing Step ── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-8 animate-fade-in">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.08)',
                }}
              >
                <Loader2
                  className="h-8 w-8"
                  style={{
                    color: 'var(--primary)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
              <div className="font-semibold text-center text-sm" style={{ color: 'var(--text-color)' }}>
                {progress}
              </div>

              {/* Progress bar */}
              {batchProgress.total > 0 && (
                <div className="w-full max-w-xs">
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-color)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        background: 'linear-gradient(90deg, var(--primary), #818cf8)',
                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-color)', opacity: 0.5 }}>
                    <span>{batchProgress.current} از {batchProgress.total} دسته</span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                </div>
              )}

              <div className="text-xs" style={{ color: 'var(--text-color)', opacity: 0.4 }}>
                لطفا صبر کنید...
              </div>
            </div>
          )}

          {/* ── Result Step ── */}
          {step === 'result' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: entries.length, label: 'سطر دفتر روزنامه', color: 'var(--primary)' },
                  { value: totalDebit.toLocaleString('fa-IR'), label: 'بدهکار (ریال)', color: '#10b981' },
                  { value: totalCredit.toLocaleString('fa-IR'), label: 'بستانکار (ریال)', color: '#f59e0b' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3 text-center transition-colors duration-200"
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                    }}
                  >
                    <div className="text-xl font-bold" style={{ color: item.color }}>
                      {item.value}
                    </div>
                    <div className="text-[0.7rem] mt-1" style={{ color: 'var(--text-color)', opacity: 0.5 }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border-color)' }}
              >
                <div className="overflow-x-auto" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table
                    className="w-full"
                    style={{
                      fontSize: '0.6875rem',
                      minWidth: 680,
                      borderCollapse: 'collapse',
                    }}
                  >
                    <thead>
                      <tr>
                        {TAX_BOOK_HEADERS.map(h => (
                          <th
                            key={h}
                            className="sticky top-0 z-10 text-right whitespace-nowrap"
                            style={{
                              background: 'var(--hover-bg)',
                              padding: '0.625rem 0.75rem',
                              borderBottom: '2px solid var(--border-color)',
                              fontWeight: 600,
                              color: 'var(--text-color)',
                              fontSize: '0.6875rem',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr
                          key={i}
                          className="transition-colors duration-100"
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--hover-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {TAX_BOOK_HEADERS.map(h => (
                            <td
                              key={h}
                              className="whitespace-nowrap"
                              style={{
                                padding: '0.5rem 0.75rem',
                                textAlign: h.includes('مبلغ') ? 'left' : 'right',
                                fontVariantNumeric: 'tabular-nums',
                                color: 'var(--text-color)',
                              }}
                            >
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {entries.length > 10 && (
                <div
                  className="text-xs text-center py-2 rounded-lg"
                  style={{
                    background: 'var(--hover-bg)',
                    color: 'var(--text-color)',
                    opacity: 0.5,
                  }}
                >
                  نمایش ۱۰ ردیف از {entries.length} ردیف
                </div>
              )}
            </div>
          )}

          {/* ── Error Step ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-5 py-8 animate-fade-in">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.08)',
                }}
              >
                <AlertCircle
                  className="h-8 w-8"
                  style={{ color: 'var(--danger)' }}
                />
              </div>
              <div className="font-semibold" style={{ color: 'var(--danger)' }}>
                خطا در تبدیل
              </div>
              <div
                className="w-full rounded-xl p-4 text-sm"
                style={{
                  background: 'var(--hover-bg)',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'var(--font-mono, monospace)',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left',
                  direction: 'ltr',
                  wordBreak: 'break-word',
                  lineHeight: 1.7,
                  color: 'var(--text-color)',
                }}
              >
                {errorMessage}
              </div>
              <button
                className="btn btn-outline btn-sm flex items-center gap-2"
                onClick={handleReset}
                style={{ minHeight: 40 }}
              >
                <RotateCcw className="h-4 w-4" />
                <span>تلاش مجدد</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="!px-6 !pb-5 !pt-0 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex gap-2.5 w-full justify-end flex-wrap" style={{ paddingTop: '1rem' }}>
            <button
              className="btn btn-outline btn-sm flex items-center gap-2"
              onClick={handleClose}
              style={{ minHeight: 40 }}
            >
              <span>بستن</span>
            </button>
            {step === 'result' && (
              <>
                <button
                  className="btn btn-outline btn-sm flex items-center gap-2"
                  onClick={handleReset}
                  style={{ minHeight: 40 }}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>تبدیل مجدد</span>
                </button>
                <button
                  className="btn btn-primary btn-sm flex items-center gap-2"
                  onClick={handleDownload}
                  style={{ minHeight: 40 }}
                >
                  <Download className="h-4 w-4" />
                  <span>دانلود اکسل</span>
                </button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
