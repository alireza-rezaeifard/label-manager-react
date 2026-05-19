import { useState } from 'react';

const FIELD_TYPES = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'dropdown', label: 'لیست انتخابی' },
  { value: 'color', label: 'رنگ' },
];

const FIELD_TYPE_BADGES = {
  text: { label: 'متن', color: 'var(--primary)' },
  number: { label: 'عدد', color: 'var(--success)' },
  date: { label: 'تاریخ', color: 'var(--warning)' },
  dropdown: { label: 'لیست', color: 'var(--info)' },
  color: { label: 'رنگ', color: 'var(--danger)' },
};

export default function SettingsTab({
  customFields, onAddField, onRemoveField, onEditField, newFieldName, onNewFieldNameChange,
  newFieldType, onNewFieldTypeChange,
  serverMode, authUser,
  tags, onAddTag, onRemoveTag,
  useVirtualScroll, onToggleVirtualScroll,
  theme, onThemeChange,
}) {
  const [newTag, setNewTag] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('text');
  const [editOptions, setEditOptions] = useState('');

  const startEdit = (f) => {
    setEditingKey(f.key);
    setEditName(f.fa || f.label || '');
    setEditType(f.fieldType || 'text');
    setEditOptions((f.options || []).join(', '));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditName('');
    setEditType('text');
    setEditOptions('');
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    const options = editType === 'dropdown'
      ? editOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    onEditField(editingKey, { label: editName.trim(), fa: editName.trim(), fieldType: editType, options });
    cancelEdit();
  };

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
          <div className="stat-icon info"><i className="ti ti-palette"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>پوسته (Theme)</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              انتخاب پوسته نمایش برنامه
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'light', icon: 'ti-sun', label: 'روشن' },
            { key: 'dark', icon: 'ti-moon', label: 'تیره' },
            { key: 'sepia', icon: 'ti-droplet', label: 'قهوه‌ای' },
            { key: 'high-contrast', icon: 'ti-contrast', label: 'کنتراست بالا' },
          ].map(t => (
            <button key={t.key} onClick={() => onThemeChange(t.key)}
              className={`btn ${theme === t.key ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className={`ti ${t.icon}`}></i>
              {t.label}
            </button>
          ))}
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
            {customFields.map(f => {
              const badge = FIELD_TYPE_BADGES[f.fieldType] || FIELD_TYPE_BADGES.text;
              const isEditing = editingKey === f.key;

              if (isEditing) {
                return (
                  <div key={f.key} style={{
                    padding: '1rem', background: 'var(--bg-body)',
                    borderRadius: 8, marginBottom: '0.5rem',
                  }}>
                    <div className="d-flex gap-2" style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <input type="text" className="form-input" value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="نام فیلد" style={{ marginBottom: 0, flex: 1, minWidth: 120 }} />
                      <select className="form-input" value={editType}
                        onChange={e => setEditType(e.target.value)}
                        style={{ width: 'auto', marginBottom: 0 }}>
                        {FIELD_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {editType === 'dropdown' && (
                      <input type="text" className="form-input" value={editOptions}
                        onChange={e => setEditOptions(e.target.value)}
                        placeholder="گزینه‌ها را با کاما جدا کنید: opt1, opt2, opt3"
                        style={{ marginBottom: '0.75rem' }} />
                    )}
                    <div className="d-flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                        <i className="ti ti-check"></i> ذخیره
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEdit}>
                        <i className="ti ti-x"></i> لغو
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={f.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', background: 'var(--bg-body)',
                  borderRadius: 8, marginBottom: '0.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span>{f.fa}</span>
                    <span style={{
                      fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 10,
                      background: badge.color, color: 'white', fontWeight: 500,
                    }}>
                      {badge.label}
                    </span>
                    {f.fieldType === 'dropdown' && f.options?.length > 0 && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                        ({f.options.length} گزینه)
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-2" style={{ alignItems: 'center' }}>
                    <i className="ti ti-pencil" style={{ cursor: 'pointer', opacity: 0.5, fontSize: '1rem' }}
                      onClick={() => startEdit(f)}></i>
                    <i className="ti ti-trash" style={{ cursor: 'pointer', opacity: 0.5, color: 'var(--danger)' }}
                      onClick={() => onRemoveField(f.key)}></i>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="d-flex gap-2" style={{ flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            value={newFieldName}
            onChange={e => onNewFieldNameChange(e.target.value)}
            placeholder="نام فیلد جدید..."
            style={{ marginBottom: 0, flex: 1, minWidth: 140 }}
            onKeyDown={e => e.key === 'Enter' && onAddField()}
          />
          <select
            className="form-input"
            value={newFieldType}
            onChange={e => onNewFieldTypeChange(e.target.value)}
            style={{ width: 'auto', marginBottom: 0 }}
          >
            {FIELD_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={onAddField}>
            <i className="ti ti-plus"></i> افزودن
          </button>
        </div>
      </div>

      <div className="form-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-icon success"><i className="ti ti-zap"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>عملکرد (Performance)</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              تنظیمات بهینه‌سازی برای حجم بالای داده
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
          <div>
            <div style={{ fontWeight: 500 }}>نمایش مجازی (Virtual Scroll)</div>
            <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>حافظه و پردازش کمتر برای هزاران رکورد</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={useVirtualScroll} onChange={onToggleVirtualScroll} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
