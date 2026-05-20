import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function ProfileTab({ authUser, serverMode, recordCount, onLogin, onBackup, onOpenBackupModal, addToast }) {
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

  const sc = { connected: 'var(--success)', error: 'var(--danger)', offline: 'var(--text-color)', checking: 'var(--warning)' };
  const st = { connected: 'Connected', error: 'Disconnected', offline: 'Offline', checking: 'Checking...' };
  const displayStatus = serverMode ? serverStatus : 'offline';

  return (
    <div className="fade-in">
      <div className="form-card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #5e50ee))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', color: '#fff', fontWeight: 'bold',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{name}</h3>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              {serverMode ? `Logged in as ${authUser?.username}` : 'Local mode (localStorage)'}
            </p>
          </div>
        </div>

        <div className="d-flex gap-3 align-items-center flex-wrap">
          <div className="d-flex align-items-center gap-2" style={{ padding: '0.5rem 1rem', background: 'var(--bg-body)', borderRadius: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: sc[displayStatus], display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.85rem' }}>Server: {st[displayStatus]}</span>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-body)', borderRadius: 8, fontSize: '0.85rem' }}>
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
              <i className="ti ti-edit"></i> Edit
            </button>
          )}
        </div>
      </div>

      <div className="form-card mb-4">
        <h4 style={{ marginBottom: '1rem' }}><i className="ti ti-bell" style={{ marginLeft: '0.5rem' }}></i>Notifications</h4>
        <div style={{ opacity: 0.6, fontSize: '0.9rem', padding: '1rem', textAlign: 'center', background: 'var(--bg-body)', borderRadius: 8 }}>
          <i className="ti ti-bell-off" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
          No notifications
        </div>
      </div>

      <div className="form-card mb-4">
        <h4 style={{ marginBottom: '1rem' }}><i className="ti ti-cloud-download" style={{ marginLeft: '0.5rem' }}></i>Backup & Restore</h4>
        <div className="d-flex gap-3">
          <button className="btn btn-primary" onClick={onBackup}>
            <i className="ti ti-download"></i> Download Backup
          </button>
          <button className="btn btn-outline" onClick={onOpenBackupModal}>
            <i className="ti ti-upload"></i> Restore Backup
          </button>
        </div>
      </div>

      <div className="form-card">
        <h4 style={{ marginBottom: '1rem' }}><i className="ti ti-settings" style={{ marginLeft: '0.5rem' }}></i>Account Settings</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <summary className="p-3" style={{ cursor: 'pointer', background: 'var(--bg-body)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <i className="ti ti-key" style={{ marginLeft: '0.5rem' }}></i>تغییر رمز عبور
                </summary>
                <div style={{ padding: '1rem', background: 'var(--bg-body)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    <i className="ti ti-device-floppy"></i> {pwLoading ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
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
              <i className="ti ti-login"></i> Go to login page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
