import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ToastType } from '../types';
import { Pencil, Bell, BellOff, CloudDownload, Download, Upload, Settings, Key, Save, LogIn } from 'lucide-react';

interface Props {
  authUser: { username?: string; role?: string } | null;
  serverMode: boolean;
  recordCount: number;
  onLogin: () => void;
  onBackup: () => void;
  onOpenBackupModal: () => void;
  addToast: (message: string, type?: ToastType['type'], duration?: number) => void;
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

  const sc: Record<string, string> = { connected: 'var(--success)', error: 'var(--danger)', offline: 'var(--text-color)', checking: 'var(--warning)' };
  const st: Record<string, string> = { connected: 'Connected', error: 'Disconnected', offline: 'Offline', checking: 'Checking...' };
  const displayStatus = serverMode ? serverStatus : 'offline';

  return (
    <div className="fade-in">
      <div className="form-card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', color: '#fff', fontWeight: 'bold',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{name}</h3>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
              {serverMode ? `Logged in as ${authUser?.username}` : 'Local mode (localStorage)'}
            </p>
          </div>
        </div>

        <div className="d-flex gap-3 align-items-center flex-wrap">
          <div className="d-flex align-items-center gap-2" style={{ padding: '0.5rem 1rem', background: 'var(--bg-body)', borderRadius: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc[displayStatus], display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.8125rem' }}>Server: {st[displayStatus]}</span>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-body)', borderRadius: 8, fontSize: '0.8125rem' }}>
            <span>{recordCount} records</span>
          </div>
          {editing ? (
            <div className="d-flex gap-2">
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Username" style={{ marginBottom: 0, width: 150 }} />
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>Save</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditing(false); setName(authUser?.username || 'Local User'); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="form-card mb-4">
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}><Bell className="h-4 w-4 inline-block ml-1" />Notifications</h4>
        <div style={{ opacity: 0.6, fontSize: '0.875rem', padding: '1rem', textAlign: 'center', background: 'var(--bg-body)', borderRadius: 8 }}>
          <BellOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No notifications
        </div>
      </div>

      <div className="form-card mb-4">
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}><CloudDownload className="h-4 w-4 inline-block ml-1" />Backup & Restore</h4>
        <div className="d-flex gap-3">
          <button className="btn btn-primary" onClick={onBackup}>
            <Download className="h-4 w-4" /> Download Backup
          </button>
          <button className="btn btn-outline" onClick={onOpenBackupModal}>
            <Upload className="h-4 w-4" /> Restore Backup
          </button>
        </div>
      </div>

      <div className="form-card">
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}><Settings className="h-4 w-4 inline-block ml-1" />Account Settings</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {serverMode ? (
            <>
              <div className="d-flex justify-content-between align-items-center p-3" style={{ background: 'var(--bg-body)', borderRadius: 8 }}>
                <span>Username</span>
                <span style={{ fontFamily: 'monospace' }}>{authUser?.username}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-3" style={{ background: 'var(--bg-body)', borderRadius: 8 }}>
                <span>Role</span>
                <span style={{ fontFamily: 'monospace' }}>{authUser?.role || 'user'}</span>
              </div>
              <details style={{ borderRadius: 8, overflow: 'hidden' }}>
                <summary className="p-3" style={{ cursor: 'pointer', background: 'var(--bg-body)', fontWeight: 600, fontSize: '0.875rem' }}>
                  <Key className="h-4 w-4 inline-block ml-1" />تغییر رمز عبور
                </summary>
                <div style={{ padding: '1rem', background: 'var(--bg-body)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <input type="password" className="form-input" placeholder="رمز عبور فعلی"
                    value={pwCurrent} onChange={e => setPwCurrent(e.target.value)}
                    style={{ marginBottom: 0, direction: 'ltr' }} />
                  <input type="password" className="form-input" placeholder="رمز عبور جدید"
                    value={pwNew} onChange={e => setPwNew(e.target.value)}
                    style={{ marginBottom: 0, direction: 'ltr' }} />
                  <input type="password" className="form-input" placeholder="تکرار رمز عبور جدید"
                    value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                    style={{ marginBottom: 0, direction: 'ltr' }} />
                  <button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={pwLoading}>
                    <Save className="h-3.5 w-3.5" /> {pwLoading ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
                  </button>
                </div>
              </details>
            </>
          ) : (
            <div className="d-flex justify-content-between align-items-center p-3" style={{ background: 'var(--bg-body)', borderRadius: 8 }}>
              <span>Status</span>
              <span>Local mode</span>
            </div>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
          <div className="d-flex justify-content-between align-items-center">
            <span>Login to server</span>
            <button className="btn btn-outline btn-sm" onClick={onLogin}>
              <LogIn className="h-3.5 w-3.5" /> Go to login page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
