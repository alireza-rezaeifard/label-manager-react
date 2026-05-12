import { useState } from 'react';

export default function ProfileTab({ authUser, serverMode, onLogin }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(authUser?.username || 'کاربر محلی');

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
              {serverMode ? `وارد شده به عنوان ${authUser?.username}` : 'حالت محلی (localStorage)'}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="d-flex gap-2 mb-3">
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="نام کاربری" />
            <button className="btn btn-primary btn-sm" onClick={() => { setEditing(false); }}>ذخیره</button>
            <button className="btn btn-outline btn-sm" onClick={() => { setEditing(false); setName(authUser?.username || 'کاربر محلی'); }}>انصراف</button>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
            <i className="ti ti-edit"></i> ویرایش پروفایل
          </button>
        )}
      </div>

      <div className="form-card mb-4">
        <h4 style={{ marginBottom: '1rem' }}><i className="ti ti-bell" style={{ marginLeft: '0.5rem' }}></i>اعلان‌ها</h4>
        <div style={{ opacity: 0.6, fontSize: '0.9rem', padding: '1rem', textAlign: 'center', background: 'var(--bg-body)', borderRadius: 8 }}>
          <i className="ti ti-bell-off" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
          هیچ اعلانی وجود ندارد
        </div>
      </div>

      <div className="form-card">
        <h4 style={{ marginBottom: '1rem' }}><i className="ti ti-settings" style={{ marginLeft: '0.5rem' }}></i>تنظیمات حساب</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {serverMode ? (
            <>
              <div className="d-flex justify-content-between align-items-center p-3" style={{ background: 'var(--bg-body)', borderRadius: 8 }}>
                <span>نام کاربری</span>
                <span style={{ fontFamily: 'monospace' }}>{authUser?.username}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-3" style={{ background: 'var(--bg-body)', borderRadius: 8 }}>
                <span>نقش</span>
                <span style={{ fontFamily: 'monospace' }}>{authUser?.role || 'user'}</span>
              </div>
            </>
          ) : (
            <div className="d-flex justify-content-between align-items-center p-3" style={{ background: 'var(--bg-body)', borderRadius: 8 }}>
              <span>وضعیت</span>
              <span>حالت محلی</span>
            </div>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
          <div className="d-flex justify-content-between align-items-center">
            <span>ورود به سرور</span>
            <button className="btn btn-outline btn-sm" onClick={onLogin}>
              <i className="ti ti-login"></i> رفتن به صفحه ورود
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
