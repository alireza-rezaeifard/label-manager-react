import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import type { Workspace, WorkspaceMember, ActivityLogEntry, AuthUserOrNull, ToastType } from '../types';
import ConfirmDialog from './ConfirmDialog';
import {
  Users, Layers, Plus, UserPlus, Shield, Crown, Trash2, LogOut,
  Activity, Clock, ArrowLeftRight, UserMinus, FolderOpen,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = { owner: 'مالک', admin: 'مدیر', editor: 'ویرایشگر', viewer: 'بیننده' };
const ROLE_HIERARCHY: Record<string, number> = { owner: 10, admin: 8, editor: 5, viewer: 1 };

interface Props {
  serverMode: boolean;
  authUser: AuthUserOrNull;
  workspaces: Workspace[];
  currentWorkspaceId: number | null;
  recordCount: number;
  customFieldCount: number;
  activityLog: ActivityLogEntry[];
  onCreate: (name: string, description: string) => Promise<void> | void;
  onInvite: (wsId: number, username: string) => Promise<void> | void;
  onLeave: (wsId: number) => Promise<void> | void;
  onDelete: (wsId: number) => Promise<void> | void;
  onLogin: () => void;
  addToast: (message: string, type?: ToastType['type'], duration?: number) => void;
}

function faDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return '—'; }
}

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

type Section = 'members' | 'activity' | 'danger';

export default function WorkspacePage({
  serverMode, authUser, workspaces, currentWorkspaceId, recordCount, customFieldCount,
  activityLog, onCreate, onInvite, onLeave, onDelete, onLogin, addToast,
}: Props) {
  const [section, setSection] = useState<Section>('members');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    | { kind: 'delete' }
    | { kind: 'leave' }
    | { kind: 'remove-member'; member: WorkspaceMember }
    | { kind: 'transfer'; member: WorkspaceMember }
    | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const currentWs = workspaces.find(w => w.id === currentWorkspaceId) || null;
  const myRole = currentWs?.member_role || authUser?.role || '';
  const myLevel = ROLE_HIERARCHY[myRole] || 0;
  const canManage = myLevel >= ROLE_HIERARCHY.admin;
  const isOwner = myRole === 'owner';

  /* Silent initial load per workspace (spinner only for manual refreshes) */
  useEffect(() => {
    if (!serverMode || !currentWorkspaceId) return;
    let cancelled = false;
    api.getWorkspaceMembers(currentWorkspaceId)
      .then(data => { if (!cancelled) setMembers(data || []); })
      .catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [serverMode, currentWorkspaceId]);

  const loadMembers = useCallback(async () => {
    if (!serverMode || !currentWorkspaceId) return;
    setMembersLoading(true);
    try {
      const data = await api.getWorkspaceMembers(currentWorkspaceId);
      setMembers(data || []);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [serverMode, currentWorkspaceId]);

  const handleInvite = async () => {
    if (!inviteName.trim() || !currentWorkspaceId) return;
    setInviting(true);
    try {
      await onInvite(currentWorkspaceId, inviteName.trim());
      setInviteName('');
      loadMembers();
    } finally {
      setInviting(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreate(newName.trim(), newDesc.trim());
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (member: WorkspaceMember, role: string) => {
    if (!currentWorkspaceId) return;
    try {
      await api.changeMemberRole(currentWorkspaceId, member.id, role);
      addToast(`نقش «${member.username}» به ${ROLE_LABELS[role] || role} تغییر کرد`, 'success');
      loadMembers();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'تغییر نقش ناموفق بود', 'error');
    }
  };

  const removeMember = async (member: WorkspaceMember) => {
    if (!currentWorkspaceId) return;
    setConfirmLoading(true);
    try {
      await api.removeMember(currentWorkspaceId, member.id);
      addToast(`«${member.username}» از فضای کاری حذف شد`, 'success');
      setConfirmAction(null);
      loadMembers();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'حذف عضو ناموفق بود', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const transferOwnership = async (member: WorkspaceMember) => {
    if (!currentWorkspaceId) return;
    setConfirmLoading(true);
    try {
      await api.transferOwnership(currentWorkspaceId, member.id);
      addToast(`مالکیت به «${member.username}» منتقل شد`, 'success');
      setConfirmAction(null);
      loadMembers();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'انتقال مالکیت ناموفق بود', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.kind === 'remove-member') return removeMember(confirmAction.member);
    if (confirmAction.kind === 'transfer') return transferOwnership(confirmAction.member);
    setConfirmLoading(true);
    try {
      if (confirmAction.kind === 'delete' && currentWorkspaceId) await onDelete(currentWorkspaceId);
      if (confirmAction.kind === 'leave' && currentWorkspaceId) await onLeave(currentWorkspaceId);
      setConfirmAction(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  /* ── Local mode: workspaces require the server ── */
  if (!serverMode) {
    return (
      <div className="ds fade-in">
        <div className="ds-page-head">
          <div>
            <div className="ds-page-eyebrow"><Layers className="h-3.5 w-3.5" /> فضای کاری</div>
            <h2 className="ds-page-title">مدیریت فضای کاری</h2>
            <p className="ds-page-desc">محیط مشترک تیم شما برای مدیریت رکوردها و برچسبها.</p>
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-empty">
            <FolderOpen className="ds-empty-icon" />
            <p className="ds-empty-title">در حالت محلی فضای کاری وجود ندارد</p>
            <p className="ds-empty-desc">
              فضاهای کاری روی سرور نگهداری میشوند. برای ساخت یا پیوستن به یک فضای کاری مشترک، وارد حساب کاربری شوید.
            </p>
            <button className="ds-btn ds-btn--primary" onClick={onLogin}>ورود به سرور</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Server mode, no workspace yet ── */
  if (workspaces.length === 0) {
    return (
      <div className="ds fade-in">
        <div className="ds-page-head">
          <div>
            <div className="ds-page-eyebrow"><Layers className="h-3.5 w-3.5" /> فضای کاری</div>
            <h2 className="ds-page-title">مدیریت فضای کاری</h2>
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-empty">
            <FolderOpen className="ds-empty-icon" />
            <p className="ds-empty-title">هنوز فضای کاریای ایجاد نکردهاید</p>
            <p className="ds-empty-desc">یک فضای کاری بسازید تا رکوردها و اعضای تیم را در یک محیط مشترک مدیریت کنید.</p>
            <button className="ds-btn ds-btn--primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> ایجاد فضای کاری
            </button>
          </div>
          {showCreate && (
            <div className="wp-create-box" style={{ marginTop: '1rem' }}>
              <label className="ds-field-label" htmlFor="ws-name">نام فضای کاری</label>
              <input id="ws-name" className="ds-input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="مثلاً TaxBook" autoFocus />
              <label className="ds-field-label" htmlFor="ws-desc" style={{ marginTop: '0.75rem' }}>توضیحات (اختیاری)</label>
              <input id="ws-desc" className="ds-input" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="هدف این فضای کاری" />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="ds-btn ds-btn--primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? 'در حال ایجاد...' : 'ایجاد'}
                </button>
                <button className="ds-btn" onClick={() => setShowCreate(false)}>انصراف</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const sections: Array<{ key: Section; numeral: string; label: string }> = [
    { key: 'members', numeral: 'I', label: 'اعضا' },
    { key: 'activity', numeral: 'II', label: 'فعالیتها' },
    ...(isOwner || workspaces.length > 1 ? [{ key: 'danger' as Section, numeral: 'III', label: 'منطقه خطر' }] : []),
  ];

  return (
    <div className="ds fade-in">
      {/* ── Page head ── */}
      <div className="ds-page-head">
        <div>
          <div className="ds-page-eyebrow"><Layers className="h-3.5 w-3.5" /> فضای کاری</div>
          <h2 className="ds-page-title">مدیریت فضای کاری</h2>
          <p className="ds-page-desc">اعضا، فعالیتها و تنظیمات محیط مشترک تیم — تغییرات این صفحه بر همه اعضا اثر میگذارد.</p>
        </div>
        {canManage && (
          <button className="ds-btn ds-btn--primary" onClick={() => setShowCreate(v => !v)}>
            <Plus className="h-4 w-4" /> فضای کاری جدید
          </button>
        )}
      </div>

      {showCreate && (
        <div className="ds-card wp-create-card">
          <SectionHead numeral="+" title="فضای کاری جدید" />
          <div className="wp-create-grid">
            <div>
              <label className="ds-field-label" htmlFor="ws-name2">نام</label>
              <input id="ws-name2" className="ds-input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="مثلاً TaxBook" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label className="ds-field-label" htmlFor="ws-desc2">توضیحات (اختیاری)</label>
              <input id="ws-desc2" className="ds-input" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="هدف این فضای کاری" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="ds-btn ds-btn--primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'در حال ایجاد...' : 'ایجاد فضای کاری'}
            </button>
            <button className="ds-btn" onClick={() => setShowCreate(false)}>انصراف</button>
          </div>
        </div>
      )}

      {/* ── Workspace identity + stats ── */}
      <div className="ds-card">
        <div className="ws-identity">
          <div className="ds-seal ds-seal--lg">
            {(currentWs?.name || '؟').charAt(0)}
            <span className="ds-seal-halo" aria-hidden="true" />
          </div>
          <div className="ws-identity-info">
            <div className="ws-identity-name-row">
              <h3 className="ws-identity-name">{currentWs?.name || 'فضای کاری'}</h3>
              {myRole && <span className={`ds-role ds-role--${myRole}`}><Crown className="h-3 w-3" />{ROLE_LABELS[myRole] || myRole}</span>}
            </div>
            {currentWs?.description
              ? <p className="ws-identity-desc">{currentWs.description}</p>
              : <p className="ws-identity-desc ws-identity-desc--empty">بدون توضیحات</p>}
            <span className="ws-identity-meta">ایجاد: {faDate(currentWs?.created_at)}</span>
          </div>
        </div>
        <div className="ds-stats" style={{ marginTop: '1.25rem' }}>
          <div className="ds-stat">
            <div className="ds-stat-value">{(currentWs?.member_count ?? members.length ?? 0).toLocaleString('fa-IR')}</div>
            <div className="ds-stat-label">عضو</div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat-value">{recordCount.toLocaleString('fa-IR')}</div>
            <div className="ds-stat-label">رکورد</div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat-value">{customFieldCount.toLocaleString('fa-IR')}</div>
            <div className="ds-stat-label">فیلد سفارشی</div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat-value">{activityLog.length.toLocaleString('fa-IR')}</div>
            <div className="ds-stat-label">رویداد اخیر</div>
          </div>
        </div>
      </div>

      {/* ── Rail + sections ── */}
      <div className="ds-layout">
        <nav className="ds-rail" aria-label="بخشهای فضای کاری">
          {sections.map(s => (
            <button key={s.key} className={`ds-rail-item ${section === s.key ? 'active' : ''}`}
              onClick={() => setSection(s.key)}>
              <span className="ds-section-numeral">{s.numeral}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="ds-card">
          {/* ── Members ── */}
          {section === 'members' && (
            <>
              <SectionHead numeral="I" title="اعضای فضای کاری" desc={`${members.length.toLocaleString('fa-IR')} نفر`} />
              {canManage && (
                <div className="wp-invite-row">
                  <UserPlus className="h-4 w-4 wp-invite-icon" />
                  <input className="ds-input" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="نام کاربری برای دعوت..."
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    aria-label="نام کاربری برای دعوت" />
                  <button className="ds-btn ds-btn--primary" onClick={handleInvite} disabled={inviting || !inviteName.trim()}>
                    {inviting ? 'در حال دعوت...' : 'دعوت'}
                  </button>
                </div>
              )}
              {membersLoading ? (
                <div className="wp-loading">در حال بارگذاری اعضا...</div>
              ) : members.length === 0 ? (
                <div className="ds-empty">
                  <Users className="ds-empty-icon" />
                  <p className="ds-empty-title">هنوز عضوی ندارید</p>
                  <p className="ds-empty-desc">با دعوت همکاران، مدیریت رکوردها را در این فضا تقسیم کنید.</p>
                  {canManage && (
                    <div style={{ display: 'inline-flex', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
                      <input className="ds-input" value={inviteName} onChange={e => setInviteName(e.target.value)}
                        placeholder="نام کاربری" onKeyDown={e => e.key === 'Enter' && handleInvite()} />
                      <button className="ds-btn ds-btn--primary" onClick={handleInvite} disabled={inviting || !inviteName.trim()}>دعوت</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="wp-members" role="table" aria-label="اعضا">
                  {members.map(m => {
                    const mLevel = ROLE_HIERARCHY[m.member_role || ''] || 0;
                    const isSelf = authUser?.id != null && m.id === authUser.id;
                    const canEditMember = canManage && (isOwner ? !isSelf : mLevel < myLevel);
                    return (
                      <div key={m.id} className="wp-member-row" role="row">
                        <div className="ds-seal ds-seal--sm" aria-hidden="true">{m.username.charAt(0).toUpperCase()}</div>
                        <div className="wp-member-info" role="cell">
                          <span className="wp-member-name">
                            {m.username}
                            {isSelf && <span className="wp-member-self">(شما)</span>}
                          </span>
                          <span className="wp-member-joined">عضویت: {faDate(m.joined_at)}</span>
                        </div>
                        <div className="wp-member-role" role="cell">
                          {canEditMember && m.member_role !== 'owner' ? (
                            <select
                              className="ds-input wp-role-select"
                              value={m.member_role || 'viewer'}
                              onChange={e => changeRole(m, e.target.value)}
                              aria-label={`نقش ${m.username}`}
                            >
                              <option value="admin">مدیر</option>
                              <option value="editor">ویرایشگر</option>
                              <option value="viewer">بیننده</option>
                            </select>
                          ) : (
                            <span className={`ds-role ds-role--${m.member_role || 'viewer'}`}>
                              {ROLE_LABELS[m.member_role || ''] || m.member_role || 'عضو'}
                            </span>
                          )}
                        </div>
                        <div className="wp-member-actions" role="cell">
                          {isOwner && !isSelf && (
                            <button className="ds-btn ds-btn--sm" title="انتقال مالکیت"
                              onClick={() => setConfirmAction({ kind: 'transfer', member: m })}>
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canEditMember && (
                            <button className="ds-btn ds-btn--sm ds-btn--danger" title="حذف از فضای کاری"
                              onClick={() => setConfirmAction({ kind: 'remove-member', member: m })}>
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Activity ── */}
          {section === 'activity' && (
            <>
              <SectionHead numeral="II" title="فعالیتهای اخیر" desc="رویدادهای ثبتشده در این فضا" />
              {activityLog.length === 0 ? (
                <div className="ds-empty">
                  <Activity className="ds-empty-icon" />
                  <p className="ds-empty-title">فعالیتی ثبت نشده</p>
                  <p className="ds-empty-desc">به محض افزودن یا ویرایش رکوردها، رویدادها اینجا نمایش داده میشوند.</p>
                </div>
              ) : (
                <ol className="wp-timeline">
                  {activityLog.slice(0, 30).map(a => (
                    <li key={a.id} className="wp-timeline-item">
                      <span className="wp-timeline-dot" aria-hidden="true" />
                      <div className="wp-timeline-body">
                        <div className="wp-timeline-text">
                          <strong>{a.user_name || 'کاربر'}</strong>
                          {' '}{a.details || a.action}
                        </div>
                        <span className="wp-timeline-time">
                          <Clock className="h-3 w-3" />
                          {faDate(a.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          {/* ── Danger zone ── */}
          {section === 'danger' && (
            <>
              <SectionHead numeral="III" title="منطقه خطر" desc="عملیات بازگشتناپذیر" />
              <div className="wp-danger-zone">
                {workspaces.length > 1 && (
                  <div className="wp-danger-row">
                    <div>
                      <div className="wp-danger-title">خروج از فضای کاری</div>
                      <div className="wp-danger-desc">دسترسی شما به «{currentWs?.name}» قطع میشود؛ رکوردهای شما حذف نمیشوند.</div>
                    </div>
                    <button className="ds-btn ds-btn--danger" onClick={() => setConfirmAction({ kind: 'leave' })}>
                      <LogOut className="h-4 w-4" /> خروج
                    </button>
                  </div>
                )}
                {isOwner && (
                  <div className="wp-danger-row">
                    <div>
                      <div className="wp-danger-title">حذف فضای کاری</div>
                      <div className="wp-danger-desc">
                        «{currentWs?.name}» با تمام رکوردها، فیلدها و اعضا برای همیشه حذف میشود. این عمل قابل بازگشت نیست.
                      </div>
                    </div>
                    <button className="ds-btn ds-btn--danger" onClick={() => setConfirmAction({ kind: 'delete' })}>
                      <Trash2 className="h-4 w-4" /> حذف فضا
                    </button>
                  </div>
                )}
                {!isOwner && workspaces.length <= 1 && (
                  <div className="ds-empty">
                    <Shield className="ds-empty-icon" />
                    <p className="ds-empty-title">عملیات مخرب در دسترس شما نیست</p>
                    <p className="ds-empty-desc">فقط مالک فضای کاری میتواند آن را حذف کند.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Confirmations ── */}
      <ConfirmDialog
        show={confirmAction?.kind === 'delete'}
        title="حذف فضای کاری"
        message={`«${currentWs?.name}» با تمام رکوردها، فیلدهای سفارشی و اعضا برای همیشه حذف میشود. این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف کن"
        variant="danger"
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        show={confirmAction?.kind === 'leave'}
        title="خروج از فضای کاری"
        message={`دسترسی شما به «${currentWs?.name}» قطع میشود. برای بازگشت باید مجدداً دعوت شوید.`}
        confirmLabel="خروج از فضا"
        variant="danger"
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        show={confirmAction?.kind === 'remove-member'}
        title="حذف عضو"
        message={`«${confirmAction?.kind === 'remove-member' ? confirmAction.member.username : ''}» از این فضای کاری حذف خواهد شد.`}
        confirmLabel="حذف عضو"
        variant="danger"
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        show={confirmAction?.kind === 'transfer'}
        title="انتقال مالکیت"
        message={`مالکیت «${currentWs?.name}» به «${confirmAction?.kind === 'transfer' ? confirmAction.member.username : ''}» منتقل میشود و نقش شما به مدیر تغییر میکند.`}
        confirmLabel="انتقال بده"
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
