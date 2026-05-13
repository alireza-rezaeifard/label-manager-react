import { useState, useRef, useEffect } from 'react';

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onCreateWorkspace,
  onInviteMember,
  onLeave,
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentWs = workspaces.find(w => w.id === currentWorkspaceId);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="workspace-btn" onClick={() => setOpen(!open)}>
        <i className="ti ti-layers-intersect"></i>
        <span>{currentWs?.name || 'فضای کاری'}</span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.8rem' }}></i>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 12, minWidth: 280, zIndex: 2000,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)', direction: 'rtl',
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
            <strong>فضاهای کاری</strong>
          </div>

          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {workspaces.map(ws => (
              <div key={ws.id} onClick={() => { onSwitch(ws.id); setOpen(false); }}
                style={{
                  padding: '0.75rem 1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: ws.id === currentWorkspaceId ? 'rgba(115, 103, 240, 0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{ws.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{ws.member_count || 1} عضو</div>
                </div>
                {ws.id === currentWorkspaceId && (
                  <i className="ti ti-check" style={{ color: 'var(--primary)' }}></i>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!showCreate ? (
              <button className="btn btn-outline btn-sm w-100" onClick={() => setShowCreate(true)}>
                <i className="ti ti-plus"></i> فضای کاری جدید
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="text" className="form-input" placeholder="نام فضای کاری"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }}
                  onKeyDown={e => e.key === 'Enter' && newName.trim() && onCreateWorkspace(newName.trim(), newDesc.trim())} />
                <input type="text" className="form-input" placeholder="توضیحات (اختیاری)"
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }} />
                <div className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                    onClick={() => { if (newName.trim()) { onCreateWorkspace(newName.trim(), newDesc.trim()); setNewName(''); setNewDesc(''); setShowCreate(false); } }}>
                    ایجاد
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>انصراف</button>
                </div>
              </div>
            )}

            {!showInvite ? (
              <button className="btn btn-outline btn-sm w-100" onClick={() => setShowInvite(true)}>
                <i className="ti ti-user-plus"></i> دعوت کاربر
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="text" className="form-input" placeholder="نام کاربری"
                  value={inviteUsername} onChange={e => setInviteUsername(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }}
                  onKeyDown={e => e.key === 'Enter' && inviteUsername.trim() && onInviteMember(currentWorkspaceId, inviteUsername.trim())} />
                <div className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                    onClick={() => { if (inviteUsername.trim()) { onInviteMember(currentWorkspaceId, inviteUsername.trim()); setInviteUsername(''); setShowInvite(false); } }}>
                    دعوت
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowInvite(false)}>انصراف</button>
                </div>
              </div>
            )}

            {workspaces.length > 1 && (
              <button className="btn btn-outline btn-sm w-100" style={{ color: 'var(--danger)' }}
                onClick={() => { if (confirm('آیا از خروج از این فضای کاری اطمینان دارید؟')) { onLeave(currentWorkspaceId); setOpen(false); } }}>
                <i className="ti ti-logout"></i> خروج از فضای کاری
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
