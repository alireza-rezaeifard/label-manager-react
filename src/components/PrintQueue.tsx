import { useState, useEffect, useCallback } from 'react';
import * as exportUtils from '../utils/exporters';
import { FIELDS } from '../data/fields';
import type { Record } from '../types';

const QUEUE_KEY = 'label-studio-print-queue';

interface PrintJob {
  id: number;
  name: string;
  recordIds: number[];
  count: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  createdAt: string;
}

function loadQueue(): PrintJob[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

function saveQueue(queue: PrintJob[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* localStorage might be full */ }
}

export default function PrintQueue({
  records,
  selectedRecords,
  addToast,
  onClose,
}: {
  records: Record[];
  selectedRecords: Record[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onClose: () => void;
}) {
  const [queue, setQueue] = useState<PrintJob[]>(loadQueue);

  useEffect(() => { saveQueue(queue); }, [queue]);

  const addToQueue = useCallback(() => {
    if (selectedRecords.length === 0) {
      addToast('حداقل یک رکورد انتخاب کنید', 'error');
      return;
    }
    const job: PrintJob = {
      id: Date.now(),
      name: `چاپ ${selectedRecords.length} برچسب`,
      recordIds: selectedRecords.map(r => r.id ?? 0),
      count: selectedRecords.length,
      status: 'pending',
      createdAt: new Date().toLocaleString('fa-IR'),
    };
    setQueue(prev => [job, ...prev]);
    addToast(`${selectedRecords.length} برچسب به صف چاپ اضافه شد`, 'success');
  }, [selectedRecords, addToast]);

  const processJob = useCallback(async (jobId: number) => {
    setQueue(prev => prev.map(j => j.id === jobId ? { ...j, status: 'processing' } : j));

    const job = queue.find(j => j.id === jobId);
    if (!job) return;

    try {
      const jobRecords = records.filter(r => job.recordIds.includes(r.id ?? -1));

      if (jobRecords.length === 0) {
        throw new Error('هیچ رکوردی برای چاپ یافت نشد');
      }

      exportUtils.printLabels(
        jobRecords,
        FIELDS,
        3,
        180,
        130,
        'classic',
        false,
        false
      );

      setQueue(prev => prev.map(j => j.id === jobId ? { ...j, status: 'complete' } : j));
      addToast(`چاپ ${jobRecords.length} برچسب انجام شد`, 'success');
    } catch (err: any) {
      setQueue(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error', error: err.message } : j));
      addToast('خطا در چاپ: ' + err.message, 'error');
    }
  }, [records, queue, addToast]);

  const removeJob = useCallback((jobId: number) => {
    setQueue(prev => prev.filter(j => j.id !== jobId));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(j => j.status === 'pending' || j.status === 'processing'));
    addToast('تاریخچه چاپ پاک شد', 'success');
  }, [addToast]);

  const pendingCount = queue.filter(j => j.status === 'pending').length;
  const hasSelected = selectedRecords.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-printer"></i> صف چاپ
            {pendingCount > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 10 }}>
                {pendingCount}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {hasSelected && (
              <button className="btn btn-primary btn-sm" onClick={addToQueue}>
                <i className="ti ti-plus"></i> افزودن به صف
              </button>
            )}
            <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={onClose}></i>
          </div>
        </div>

        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
            <i className="ti ti-printer-off" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
            <p>صف چاپ خالی است</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>رکوردها را انتخاب کنید و به صف اضافه نمایید</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 400, overflowY: 'auto' }}>
              {queue.map(job => (
                <div key={job.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)', borderRadius: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.25rem' }}>
                      {job.count} رکورد • {job.createdAt}
                    </div>
                    {job.status === 'error' && job.error && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                        {job.error}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {job.status === 'pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => processJob(job.id)}>
                        <i className="ti ti-player-play"></i> چاپ
                      </button>
                    )}
                    {job.status === 'processing' && (
                      <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }}></i> در حال چاپ...
                      </span>
                    )}
                    {job.status === 'complete' && (
                      <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
                        <i className="ti ti-check"></i> انجام شد
                      </span>
                    )}
                    {job.status === 'error' && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                        <i className="ti ti-alert-circle"></i> خطا
                      </span>
                    )}
                    <i className="ti ti-trash" style={{ cursor: 'pointer', opacity: 0.4, fontSize: '1.1rem' }}
                      onClick={() => removeJob(job.id)}></i>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>مجموع: {queue.length} کار</span>
              {queue.some(j => j.status === 'complete' || j.status === 'error') && (
                <button className="btn btn-outline btn-sm" onClick={clearCompleted}>
                  <i className="ti ti-trash"></i> پاک کردن انجام شده‌ها
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
