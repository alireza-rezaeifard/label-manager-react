import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ToastType } from '../types';
import {
  Download, Upload, KeyRound, LogIn, Shield,
  Server, Database, Eye, EyeOff, Loader2, CloudDownload,
} from 'lucide-react';

interface Props {
  authUser: { username?: string; role?: string } | null;
  serverMode: boolean;
  recordCount: number;
  onLogin: () => void;
  onBackup: () => void;
  onOpenBackupModal: () => void;
  addToast: (message: string, type?: ToastType['type'], duration?: number) => void;
}

const ROLE_LABELS: Record<string, string> = { owner: 'مالک', admin: 'مدیر', editor: 'ویرایشگر', viewer: 'بیننده', user: 'کاربر' };

function SectionHead({ numeral, title, desc }: { numeral: string; title: string; desc?: string }) {
  return (
    <div className="ds-section-head">
      <span className="ds-section-numeral">{numeral}</span>
      <h4 className="ds-section-title">{title}</h4>
      {desc && <span className="ds-section-desc">{desc}</span>}
      <div className="ds-section-rule" />
    </div>
  );
}

export default function ProfileTab({ authUser, serverMode, recordCount, onLogin, onBackup, onOpenBackupModal, addToast }: Props) {
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (!serverMode) return;
    (async () => {
      try {
        await api.getMe();
        setServerStatus('connected');
      } catch { setServerStatus('error'); }
    })();
  }, [serverMode]);

  const pwMismatch = pwConfirm.length > 0 && pwNew !== pwConfirm;
  const pwTooShort = pwNew.length > 0 && pwNew.length < 6;
  const canSubmit = pwCurrent && pwNew && pwConfirm && !pwMismatch && !pwTooShort;

  const handleChangePassword = async () => {
    if (!canSubmit) return;
    setPwLoading(true);
    setPwError(null);
    try {
      await api.changePassword(pwCurrent, pwNew);
      addToast('رمز عبور با موفقیت تغییر کرد', 'success');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تغییر رمز عبور ناموفق بود';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const displayName = authUser?.username || 'کاربر محلی';
  const roleLabel = authUser?.role ? (ROLE_LABELS[authUser.role] || authUser.role) : null;

  return (
    <div className="ds fade-in">
      {/* ── Page head ── */}
      <div className="ds-page-head">
        <div>
          <div className="ds-page-eyebrow"><Shield className="h-3.5 w-3.5" /> حساب کاربری</div>
          <h2 className="ds-page-title">پروفایل</h2>
          <p className="ds-page-desc">اطلاعات حساب، امنیت و پشتیبانگیری شخصی شما.</p>
        </div>
      </div>

      {/* ── Identity ── */}
      <div className="ds-card">
        <div className="pf-identity">
          <div className="ds-seal ds-seal--lg">
            {displayName.charAt(0).toUpperCase()}
            <span className="ds-seal-halo" aria-hidden="true" />
          </div>
          <div className="pf-identity-info">
            <div className="pf-identity-name-row">
              <h3 className="pf-identity-name">{displayName}</h3>
              {roleLabel && <span className={`ds-role ds-role--${authUser?.role === 'admin' ? 'admin' : authUser?.role === 'owner' ? 'owner' : 'viewer'}`}>{roleLabel}</span>}
            </div>
            <p className="pf-identity-sub">
              {serverMode ? (
                <>
                  <span
                    className="pf-status-dot"
                    style={{ background: serverStatus === 'connected' ? 'var(--success)' : serverStatus === 'error' ? 'var(--danger)' : 'var(--warning)' }}
                    aria-hidden="true"
                  />
                  {serverStatus === 'connected' ? 'متصل به سرور' : serverStatus === 'error' ? 'خطای اتصال به سرور' : 'در حال بررسی اتصال...'}
                </>
              ) : 'حالت محلی — دادهها در همین مرورگر ذخیره میشوند'}
            </p>
          </div>
          {!serverMode && (
            <button className="ds-btn" onClick={onLogin}>
              <LogIn className="h-4 w-4" /> ورود به سرور
            </button>
          )}
        </div>
        <div className="ds-stats" style={{ marginTop: '1.25rem' }}>
          <div className="ds-stat">
            <div className="ds-stat-value">{recordCount.toLocaleString('fa-IR')}</div>
            <div className="ds-stat-label"><Database className="h-3 w-3" /> رکورد</div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat-value" style={{ fontSize: '0.9375rem', paddingTop: '0.35rem' }}>
              {serverMode ? (roleLabel || 'کاربر') : 'محلی'}
            </div>
            <div className="ds-stat-label">نقش</div>
          </div>
        </div>
      </div>

      <div className="pf-grid">
        {/* ── Account info ── */}
        <div className="ds-card">
          <SectionHead numeral="I" title="اطلاعات حساب" />
          <div className="ds-kv">
            <span className="ds-kv-label">نام کاربری</span>
            <span className="ds-kv-value">{displayName}</span>
          </div>
          <div className="ds-kv">
            <span className="ds-kv-label">نقش</span>
            <span className="ds-kv-value">{serverMode ? (roleLabel || '—') : 'بدون سرور'}</span>
          </div>
          <div className="ds-kv">
            <span className="ds-kv-label">وضعیت</span>
            <span className="ds-kv-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {serverMode ? (
                <>
                  <Server className="h-3.5 w-3.5" style={{ opacity: 0.5 }} />
                  {serverStatus === 'connected' ? 'متصل' : serverStatus === 'error' ? 'قطع' : 'در حال بررسی'}
                </>
              ) : 'حالت محلی'}
            </span>
          </div>
          {!serverMode && (
            <p className="pf-local-note">
              در حالت محلی، اطلاعات حساب روی سرور وجود ندارد. برای حساب کاربری کامل به سرور متصل شوید.
            </p>
          )}
        </div>

        {/* ── Security ── */}
        <div className="ds-card">
          <SectionHead numeral="II" title="امنیت" desc={serverMode ? undefined : 'نیازمند اتصال به سرور'} />
          {serverMode ? (
            <form className="pf-pw-form" onSubmit={e => { e.preventDefault(); handleChangePassword(); }}>
              <div>
                <label className="ds-field-label" htmlFor="pw-current">رمز عبور فعلی</label>
                <input id="pw-current" type="password" className="ds-input" dir="ltr" autoComplete="current-password"
                  value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="ds-field-label" htmlFor="pw-new">رمز عبور جدید</label>
                <div className="pf-pw-wrap">
                  <input id="pw-new" type={showNewPw ? 'text' : 'password'} className="ds-input" dir="ltr" autoComplete="new-password"
                    value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="حداقل ۶ کاراکتر" />
                  <button type="button" className="pf-pw-toggle" onClick={() => setShowNewPw(v => !v)}
                    aria-label={showNewPw ? 'پنهان کردن رمز' : 'نمایش رمز'}>
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwTooShort && <p className="pf-field-error">رمز عبور باید حداقل ۶ کاراکتر باشد</p>}
              </div>
              <div>
                <label className="ds-field-label" htmlFor="pw-confirm">تکرار رمز عبور جدید</label>
                <input id="pw-confirm" type="password" className="ds-input" dir="ltr" autoComplete="new-password"
                  value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="••••••••"
                  aria-invalid={pwMismatch || undefined} />
                {pwMismatch && <p className="pf-field-error">تکرار رمز عبور مطابقت ندارد</p>}
              </div>
              {pwError && <div className="pf-form-error" role="alert">{pwError}</div>}
              <button type="submit" className="ds-btn ds-btn--primary" disabled={!canSubmit || pwLoading}>
                {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {pwLoading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
              </button>
            </form>
          ) : (
            <div className="ds-empty">
              <KeyRound className="ds-empty-icon" />
              <p className="ds-empty-title">تغییر رمز در حالت محلی ممکن نیست</p>
              <p className="ds-empty-desc">پس از اتصال به سرور و ورود با حساب کاربری، میتوانید رمز عبور را تغییر دهید.</p>
              <button className="ds-btn ds-btn--primary" onClick={onLogin}>
                <LogIn className="h-4 w-4" /> ورود به سرور
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Backup ── */}
      <div className="ds-card">
        <SectionHead numeral="III" title="پشتیبانگیری و بازیابی" desc="از رکوردهای این فضای کاری" />
        <div className="pf-backup-row">
          <button className="ds-btn" onClick={onBackup}>
            <Download className="h-4 w-4" /> دانلود پشتیبان
          </button>
          <button className="ds-btn" onClick={onOpenBackupModal}>
            <Upload className="h-4 w-4" /> بازیابی از فایل
          </button>
          <span className="pf-backup-hint"><CloudDownload className="h-3.5 w-3.5" /> پشتیبان بگیرید — تنها راه جابجایی دادهها بین مرورگرها</span>
        </div>
      </div>
    </div>
  );
}
