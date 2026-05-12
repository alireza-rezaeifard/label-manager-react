import { useState } from 'react';

export default function SettingsTab({
  customFields, onAddField, onRemoveField, newFieldName, onNewFieldNameChange,
  serverMode, authUser,
  tags, onAddTag, onRemoveTag,
}) {
  const [newTag, setNewTag] = useState('');

  return (
    <div className="fade-in">
      <div className="form-card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-icon info"><i className="ti ti-server"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>اتصال به سرور</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              {serverMode ? `متصل به عنوان ${authUser?.username || 'کاربر'}` : 'حالت محلی (localStorage)'}
            </p>
          </div>
        </div>
      </div>

      <div className="form-card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-icon primary"><i className="ti ti-tags"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>برچسب‌ها (Tags)</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              برچسب‌های دلخواه برای دسته‌بندی رکوردها
            </p>
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {tags.map(tag => (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.8rem', background: 'var(--primary)',
                color: 'white', borderRadius: 20, fontSize: '0.85rem',
              }}>
                {tag}
                <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                  onClick={() => onRemoveTag(tag)}></i>
              </span>
            ))}
          </div>
        )}

        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-input"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="نام برچسب جدید..."
            style={{ marginBottom: 0 }}
            onKeyDown={e => { if (e.key === 'Enter') { onAddTag(newTag); setNewTag(''); } }}
          />
          <button className="btn btn-primary" onClick={() => { onAddTag(newTag); setNewTag(''); }}>
            <i className="ti ti-plus"></i> افزودن
          </button>
        </div>
      </div>

      <div className="form-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-icon warning"><i className="ti ti-list-details"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>فیلدهای سفارشی</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              فیلدهای دلخواه خود را به رکوردها اضافه کنید
            </p>
          </div>
        </div>

        {customFields.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            {customFields.map(f => (
              <div key={f.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--bg-body)',
                borderRadius: 8, marginBottom: '0.5rem',
              }}>
                <span>{f.fa}</span>
                <i className="ti ti-trash" style={{ cursor: 'pointer', opacity: 0.5, color: 'var(--danger)' }}
                  onClick={() => onRemoveField(f.key)}></i>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-input"
            value={newFieldName}
            onChange={e => onNewFieldNameChange(e.target.value)}
            placeholder="نام فیلد جدید..."
            style={{ marginBottom: 0 }}
            onKeyDown={e => e.key === 'Enter' && onAddField()}
          />
          <button className="btn btn-primary" onClick={onAddField}>
            <i className="ti ti-plus"></i> افزودن
          </button>
        </div>
      </div>
    </div>
  );
}
