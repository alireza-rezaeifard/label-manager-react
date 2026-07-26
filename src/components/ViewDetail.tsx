import { FIELDS } from '../data/fields';
import { formatAmount } from '../utils/formatters';
import type { RecordItem, CustomField } from '../types';
import CommentsPanel from './CommentsPanel';

const ALL_USERS_KEY = 'label-studio-team-users';
function loadTeamUsers(): string[] {
  try { return JSON.parse(localStorage.getItem(ALL_USERS_KEY) || '[]'); } catch { return []; }
}

export default function ViewDetail({ record, relatedRecords, onEdit, onNavigateToRelated, customFields = [], onShowHistory, onLock, onUnlock, serverMode, currentUserName }: {
  record: RecordItem;
  relatedRecords: RecordItem[];
  onEdit: () => void;
  onNavigateToRelated: (rel: RecordItem) => void;
  customFields?: CustomField[];
  onShowHistory?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  serverMode?: boolean;
  currentUserName?: string;
}) {
  const teamUsers = serverMode ? (loadTeamUsers().length > 0 ? loadTeamUsers() : ['admin', 'user']) : [];
  const defaultUser = currentUserName || 'کاربر';

  return (
    <div className="vd fade-in">
      <div className="vd-card">
        {record.image && (
          <div className="vd-image-wrap">
            <img src={record.image} alt={record.code} className="vd-image" />
          </div>
        )}
        <div className="vd-header">
          <div className="vd-header-left">
            <div className="vd-emblem">
              <i className="ti ti-tag"></i>
            </div>
            <div>
              <h3 className="vd-code">{record.code}</h3>
              <span className="vd-meta">{record.type || '—'} - {record.project}</span>
            </div>
          </div>
          <div className="vd-header-actions">
            {onShowHistory && (
              <button className="btn btn-outline" onClick={onShowHistory}>
                <i className="ti ti-history"></i> تاریخچه
              </button>
            )}
            {record.locked_by ? (
              onUnlock && (
                <button className="btn btn-outline" onClick={onUnlock} title={`قفل شده توسط ${record.locked_by}`}>
                  <i className="ti ti-lock-open"></i> باز کردن قفل
                </button>
              )
            ) : (
              onLock && (
                <button className="btn btn-outline" onClick={onLock}>
                  <i className="ti ti-lock"></i> قفل کردن
                </button>
              )
            )}
            <button className="btn btn-outline" onClick={onEdit}>
              <i className="ti ti-edit"></i> ویرایش
            </button>
          </div>
        </div>

        <div className="vd-fields-grid">
          {[...FIELDS.filter(f => f.key !== 'code' && f.key !== 'related'), ...customFields].map(f => (
            <div key={f.key} className="vd-field-card">
              <div className="vd-field-label">{f.fa}</div>
              <div className={`vd-field-value ${f.key === 'amount' ? 'ltr' : ''}`}>
                {f.key === 'amount' ? formatAmount(record[f.key]) : (record[f.key] || '—')}
              </div>
            </div>
          ))}
          {record.tags && record.tags.length > 0 && (
            <div className="vd-field-card full-width">
              <div className="vd-field-label">برچسب‌ها</div>
              <div className="vd-tags">
                {record.tags.map((tag: string) => (
                  <span key={tag} className="vd-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {record.notes && (
            <div className="vd-field-card full-width">
              <div className="vd-field-label">یادداشت</div>
              <div className="vd-field-value">{record.notes}</div>
            </div>
          )}
        </div>

        {/* ── Related Records ── */}
        {relatedRecords.length > 0 ? (
          <div className="vd-section">
            <h4 className="vd-section-title">
              <i className="ti ti-link vd-section-icon"></i>
              برچسب‌های مرتبط ({relatedRecords.length})
            </h4>
            <div className="vd-rel-list">
              {relatedRecords.map((rel: RecordItem) => (
                <div key={rel.code} className="vd-rel-item" onClick={() => onNavigateToRelated(rel)}>
                  <div className="vd-rel-left">
                    <div className="vd-rel-emblem">
                      <i className="ti ti-tag"></i>
                    </div>
                    <div>
                      <div className="vd-rel-code">{rel.code}</div>
                      <div className="vd-rel-project">{rel.project}</div>
                    </div>
                  </div>
                  <div className="vd-rel-right">
                    <span className="vd-rel-type">{rel.type}</span>
                    <i className="ti ti-arrow-left vd-rel-arrow"></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="vd-section vd-section-empty">
            <i className="ti ti-link-off"></i>
            <p>هیچ برچسب مرتبطی وجود ندارد</p>
          </div>
        )}

        {/* ── Comments ── */}
        <div className="vd-section">
          <CommentsPanel
            recordId={record.id || record.code}
            recordCode={record.code}
            teamMembers={teamUsers}
            serverMode={!!serverMode}
            userName={defaultUser}
          />
        </div>
      </div>

      <style>{`
        .vd { max-width: 900px; margin: 0 auto; }
        .vd-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 14px; padding: 2rem; }
        .vd-image-wrap { margin-bottom: 1.5rem; text-align: center; }
        .vd-image { max-width: 100%; max-height: 300px; border-radius: 12px; border: 1px solid var(--border-color); object-fit: contain; }
        .vd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .vd-header-left { display: flex; align-items: center; gap: 1rem; }
        .vd-emblem { width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, var(--primary), #818cf8); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; flex-shrink: 0; }
        .vd-code { margin: 0; font-family: monospace; direction: ltr; }
        .vd-meta { opacity: 0.6; font-size: 0.875rem; }
        .vd-header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .vd-fields-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .vd-field-card { background: var(--bg-body); padding: 1rem; border-radius: 8px; }
        .vd-field-card.full-width { grid-column: 1 / -1; }
        .vd-field-label { font-size: 0.75rem; opacity: 0.6; margin-bottom: 0.25rem; }
        .vd-field-value { font-weight: 600; }
        .vd-field-value.ltr { direction: ltr; }
        .vd-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .vd-tag { padding: 0.3rem 0.8rem; background: rgba(40, 199, 111, 0.12); color: var(--success); border-radius: 12px; font-size: 0.8rem; }
        .vd-section { border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem; }
        .vd-section-title { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.9375rem; }
        .vd-section-icon { color: var(--primary); }
        .vd-section-empty { opacity: 0.5; text-align: center; padding: 2rem; }
        .vd-section-empty p { margin: 0.5rem 0 0; }
        .vd-rel-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .vd-rel-item { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-body); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .vd-rel-item:hover { background: var(--hover-bg); }
        .vd-rel-left { display: flex; align-items: center; gap: 0.75rem; }
        .vd-rel-emblem { width: 36px; height: 36px; border-radius: 8px; background: rgba(6, 182, 212, 0.12); display: flex; align-items: center; justify-content: center; color: #06b6d4; }
        .vd-rel-code { font-family: monospace; font-weight: 600; }
        .vd-rel-project { font-size: 0.8rem; opacity: 0.6; }
        .vd-rel-right { display: flex; align-items: center; gap: 0.5rem; }
        .vd-rel-type { font-size: 0.75rem; opacity: 0.5; }
        .vd-rel-arrow { opacity: 0.5; }
        @media (max-width: 768px) {
          .vd-card { padding: 1.25rem; }
          .vd-header { flex-direction: column; align-items: flex-start; }
          .vd-fields-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
