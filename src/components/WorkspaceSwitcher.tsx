import { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';

const ROLE_LABELS = { owner: 'مالک', admin: 'مدیر', editor: 'ویرایشگر', viewer: 'بیننده' };
const ROLE_HIERARCHY = { owner: 10, admin: 8, editor: 5, viewer: 1 };

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onCreateWorkspace,
  onInviteMember,
  onLeave,
  onDeleteWorkspace,
  currentRole,
}: {
  workspaces: any[];
  currentWorkspaceId: number | null;
  onSwitch: (id: number) => void;
  onCreateWorkspace: (name: string, desc: string) => void;
  onInviteMember: (wsId: number, username: string) => void;
  onLeave: (wsId: number) => void;
  onDeleteWorkspace: (wsId: number) => void;
  currentRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
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
  const canManage = currentRole && (ROLE_HIERARCHY[currentRole] || 0) >= ROLE_HIERARCHY.admin;
  const isOwner = currentRole === 'owner';

  const loadMembers = async () => {
    if (!currentWorkspaceId) return;
    setMembersLoading(true);
    try {
      const data = await api.getWorkspaceMembers(currentWorkspaceId);
      setMembers(data);
    } catch {}
    setMembersLoading(false);
  };

  const handleViewMembers = () => {
    setShowMembers(true);
    loadMembers();
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="workspace-btn" onClick={() => setOpen(!open)}>
        <i className="ti ti-layers-intersect"></i>
        <span>{currentWs?.name || 'فضای کاری'}</span>
        {currentRole && (
          <span style={{
            fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 4,
            background: 'var(--primary)', color: '#fff', marginRight: '0.25rem',
          }}>
            {ROLE_LABELS[currentRole] || currentRole}
          </span>
        )}
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

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {workspaces.map(ws => (
              <div key={ws.id} onClick={() => { onSwitch(ws.id); setOpen(false); }}
                style={{
                  padding: '0.75rem 1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: ws.id === currentWorkspaceId ? 'rgba(115, 103, 240, 0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ws.name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{ws.member_count || 1} عضو</div>
                  </div>
                  <span style={{
                    fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                    background: ws.member_role === 'owner' ? 'var(--warning)' : ws.member_role === 'admin' ? 'var(--primary)' : 'var(--border-color)',
                    color: ws.member_role === 'owner' ? '#000' : '#fff',
                  }}>
                    {ROLE_LABELS[ws.member_role] || ws.member_role}
                  </span>
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

            {canManage && (
              !showInvite ? (
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
              )
            )}

            {!showMembers ? (
              <button className="btn btn-outline btn-sm w-100" onClick={handleViewMembers}>
                <i className="ti ti-users"></i> مشاهده اعضا
              </button>
            ) : (
              <div className="form-card" style={{ padding: '0.75rem', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>اعضای فضای کاری</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setShowMembers(false)}></i>
                </div>
                {membersLoading ? (
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>در حال بارگذاری...</div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-color)' }}>
                        <span>{m.username}</span>
                        <span style={{
                          fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                          background: m.member_role === 'owner' ? 'var(--warning)' : m.member_role === 'admin' ? 'var(--primary)' : 'var(--border-color)',
                          color: m.member_role === 'owner' ? '#000' : '#fff',
                        }}>
                          {ROLE_LABELS[m.member_role] || m.member_role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isOwner && (
              <button className="btn btn-outline btn-sm w-100" style={{ color: 'var(--danger)' }}
                onClick={() => { if (confirm('آیا از حذف این فضای کاری اطمینان دارید؟ تمام رکوردها و اعضا حذف خواهند شد.')) { onDeleteWorkspace(currentWorkspaceId); setOpen(false); } }}>
                <i className="ti ti-trash"></i> حذف فضای کاری
              </button>
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
