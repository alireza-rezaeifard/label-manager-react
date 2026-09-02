import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ToastType } from '../types';
import {
  Pencil, Bell, BellOff, CloudDownload, Download, Upload, Settings, Key, Save, LogIn,
  User, Shield, Server, Database, Crown, CheckCircle, XCircle, AlertTriangle,
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

function SectionHeader({ numeral, title, icon: Icon }: {
  numeral: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="pt-section-header">
      <div className="pt-section-badge"><Icon className="pt-section-badge-icon" /></div>
      <span className="pt-section-numeral">{numeral}</span>
      <h4 className="pt-section-title">{title}</h4>
      <div className="pt-section-rule" />
    </div>
  );
}

export default function ProfileTab({ authUser, serverMode, recordCount, onLogin, onBackup, onOpenBackupModal, addToast }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(authUser?.username || 'کاربر محلی');
  const [serverStatus, setServerStatus] = useState('offline');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      addToast('تمام فیلدها را پر کنید', 'error');
      return;
    }
    if (pwNew !== pwConfirm) {
      addToast('رمز عبور جدید و تکرار آن مطابقت ندارند', 'error');
      return;
    }
    setPwLoading(true);
    try {
      await api.changePassword(pwCurrent, pwNew);
      addToast('رمز عبور با موفقیت تغییر کرد', 'success');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    if (!serverMode) return;
    (async () => {
      try {
        await api.getMe();
        setServerStatus('connected');
      } catch { setServerStatus('error'); }
    })();
  }, [serverMode]);

  const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    connected: { color: 'var(--success)', label: 'Connected', icon: <CheckCircle className="pt-status-icon" /> },
    error: { color: 'var(--danger)', label: 'Disconnected', icon: <XCircle className="pt-status-icon" /> },
    offline: { color: 'var(--text-color)', label: 'Offline', icon: <AlertTriangle className="pt-status-icon" /> },
    checking: { color: 'var(--warning)', label: 'Checking...', icon: <AlertTriangle className="pt-status-icon" /> },
  };

  const displayStatus = serverMode ? serverStatus : 'offline';
  const sc = statusConfig[displayStatus];

  return (
    <div className="pt fade-in">
      {/* ── Profile Hero ── */}
      <div className="pt-hero">
        <div className="pt-avatar-wrap">
          <div className="pt-avatar">
            <span className="pt-avatar-letter">{name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="pt-avatar-ring" />
          <div className="pt-avatar-badge">
            <Crown className="pt-avatar-badge-icon" />
          </div>
        </div>
        <div className="pt-hero-info">
          <h2 className="pt-hero-name">{name}</h2>
          <p className="pt-hero-sub">
            {serverMode ? `Logged in as ${authUser?.username}` : 'Local mode (localStorage)'}
          </p>
          <div className="pt-hero-tags">
            <span className="pt-hero-tag">
              <Server className="pt-hero-tag-icon" />
              {serverMode ? sc.label : 'Offline'}
              <span className="pt-hero-status-dot" style={{ background: sc.color }} />
            </span>
            <span className="pt-hero-tag">
              <Database className="pt-hero-tag-icon" />
              {recordCount.toLocaleString('fa-IR')} رکورد
            </span>
            {authUser?.role && (
              <span className="pt-hero-tag">
                <Shield className="pt-hero-tag-icon" />
                {authUser.role}
              </span>
            )}
          </div>
        </div>
        <div className="pt-hero-actions">
          {editing ? (
            <div className="pt-edit-row">
              <input type="text" className="pt-edit-input" value={name} onChange={e => setName(e.target.value)} placeholder="Username" />
              <button className="pt-btn-sm primary" onClick={() => setEditing(false)}>Save</button>
              <button className="pt-btn-sm" onClick={() => { setEditing(false); setName(authUser?.username || 'Local User'); }}>Cancel</button>
            </div>
          ) : (
            <button className="pt-btn-sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> ویرایش نام
            </button>
          )}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="pt-panel">
        <SectionHeader numeral="I" title="اعلانات" icon={Bell} />
        <div className="pt-empty-state">
          <BellOff className="pt-empty-icon" />
          <p>اعلانی وجود ندارد</p>
        </div>
      </div>

      {/* ── Backup & Restore ── */}
      <div className="pt-panel">
        <SectionHeader numeral="II" title="پشتیبان‌گیری و بازیابی" icon={CloudDownload} />
        <div className="pt-backup-actions">
          <button className="pt-btn" onClick={onBackup}>
            <Download className="h-4 w-4" /> دانلود پشتیبان
          </button>
          <button className="pt-btn" onClick={onOpenBackupModal}>
            <Upload className="h-4 w-4" /> بازیابی پشتیبان
          </button>
        </div>
      </div>

      {/* ── Account Settings ── */}
      <div className="pt-panel">
        <SectionHeader numeral="III" title="تنظیمات حساب" icon={Settings} />
        <div className="pt-settings-list">
          {serverMode ? (
            <>
              <div className="pt-setting-row">
                <span className="pt-setting-label">Username</span>
                <span className="pt-setting-value">{authUser?.username}</span>
              </div>
              <div className="pt-setting-row">
                <span className="pt-setting-label">Role</span>
                <span className="pt-setting-value">{authUser?.role || 'user'}</span>
              </div>
              <details className="pt-details">
                <summary className="pt-details-summary">
                  <Key className="pt-details-icon" />تغییر رمز عبور
                </summary>
                <div className="pt-details-body">
                  <input type="password" className="pt-pw-input" placeholder="رمز عبور فعلی"
                    value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} />
                  <input type="password" className="pt-pw-input" placeholder="رمز عبور جدید"
                    value={pwNew} onChange={e => setPwNew(e.target.value)} />
                  <input type="password" className="pt-pw-input" placeholder="تکرار رمز عبور جدید"
                    value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
                  <button className="pt-btn-sm primary" onClick={handleChangePassword} disabled={pwLoading}>
                    <Save className="h-3.5 w-3.5" /> {pwLoading ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
                  </button>
                </div>
              </details>
            </>
          ) : (
            <div className="pt-setting-row">
              <span className="pt-setting-label">Status</span>
              <span className="pt-setting-value">Local mode</span>
            </div>
          )}

          <div className="pt-divider" />

          <div className="pt-setting-row">
            <span className="pt-setting-label">ورود به سرور</span>
            <button className="pt-btn-sm" onClick={onLogin}>
              <LogIn className="h-3.5 w-3.5" /> صفحه ورود
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* ══════════════════════════════════════════════════════════════
           Profile — Classic Badge Theme
           ══════════════════════════════════════════════════════════════ */

        .pt {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Hero ── */
        .pt-hero {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          position: relative;
          overflow: hidden;
        }

        .pt-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--persian-teal), var(--primary));
        }

        .pt-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .pt-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--persian-teal));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(var(--primary-rgb), 0.3);
        }

        .pt-avatar-letter {
          font-size: 2rem;
          color: white;
          font-weight: 700;
          font-family: 'Georgia', serif;
        }

        .pt-avatar-ring {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 2px dashed rgba(var(--primary-rgb), 0.2);
          pointer-events: none;
        }

        .pt-avatar-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--card-bg);
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pt-avatar-badge-icon {
          width: 12px;
          height: 12px;
          color: var(--primary);
        }

        .pt-hero-info {
          flex: 1;
          min-width: 0;
        }

        .pt-hero-name {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 800;
          color: var(--text-color);
          letter-spacing: -0.02em;
        }

        .pt-hero-sub {
          margin: 0.25rem 0 0.75rem;
          font-size: 0.8125rem;
          color: var(--text-color);
          opacity: 0.45;
        }

        .pt-hero-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .pt-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.3rem 0.75rem;
          background: var(--hover-bg);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-color);
        }

        .pt-hero-tag-icon {
          width: 12px;
          height: 12px;
          opacity: 0.5;
        }

        .pt-hero-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .pt-hero-actions {
          flex-shrink: 0;
        }

        .pt-edit-row {
          display: flex;
          gap: 0.375rem;
          align-items: center;
        }

        .pt-edit-input {
          width: 150px;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-body);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-family: inherit;
        }

        .pt-edit-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* ── Panel ── */
        .pt-panel {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1.5rem;
        }

        /* ── Section Header ── */
        .pt-section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .pt-section-badge {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: linear-gradient(135deg, var(--primary), var(--persian-teal));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pt-section-badge-icon {
          width: 13px;
          height: 13px;
          color: white;
        }

        .pt-section-numeral {
          font-family: 'Georgia', serif;
          font-size: 0.5625rem;
          font-weight: 700;
          color: var(--primary);
          background: rgba(var(--primary-rgb), 0.06);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          border: 1px solid rgba(var(--primary-rgb), 0.1);
        }

        .pt-section-title {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .pt-section-rule {
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }

        /* ── Empty State ── */
        .pt-empty-state {
          text-align: center;
          padding: 2rem;
          background: var(--hover-bg);
          border-radius: 10px;
          color: var(--text-color);
          opacity: 0.5;
        }

        .pt-empty-icon {
          width: 32px;
          height: 32px;
          margin: 0 auto 0.75rem;
          opacity: 0.4;
        }

        /* ── Backup ── */
        .pt-backup-actions {
          display: flex;
          gap: 0.625rem;
        }

        /* ── Settings List ── */
        .pt-settings-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .pt-setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0;
        }

        .pt-setting-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-color);
        }

        .pt-setting-value {
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 0.8125rem;
          color: var(--text-color);
          opacity: 0.7;
          background: var(--hover-bg);
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
        }

        .pt-divider {
          height: 1px;
          background: var(--border-color);
          margin: 0.25rem 0;
        }

        /* ── Details ── */
        .pt-details {
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .pt-details-summary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          background: var(--hover-bg);
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--text-color);
          transition: background 0.15s;
        }

        .pt-details-summary:hover {
          background: var(--border-color);
        }

        .pt-details-icon {
          width: 16px;
          height: 16px;
          opacity: 0.6;
        }

        .pt-details-body {
          padding: 1rem;
          background: var(--hover-bg);
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .pt-pw-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-body);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-family: inherit;
          direction: ltr;
          margin-bottom: 0;
        }

        .pt-pw-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* ── Buttons ── */
        .pt-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .pt-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .pt-btn-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.4rem 0.875rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .pt-btn-sm:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .pt-btn-sm.primary {
          background: linear-gradient(135deg, var(--primary), var(--persian-teal));
          color: white;
          border: none;
          box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.25);
        }

        .pt-btn-sm.primary:hover {
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.35);
        }

        .pt-btn-sm.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Status icon ── */
        .pt-status-icon {
          width: 14px;
          height: 14px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .pt-hero {
            flex-direction: column;
            text-align: center;
            padding: 1.5rem;
          }

          .pt-hero-tags {
            justify-content: center;
          }

          .pt-hero-actions {
            width: 100%;
          }

          .pt-edit-row {
            justify-content: center;
          }

          .pt-backup-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
