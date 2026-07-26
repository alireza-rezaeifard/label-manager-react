import React from 'react';
import RecordForm from '../RecordForm';
import type { RecordItem, Template, CustomField } from '../../types';
import { INVOICE_TEMPLATES } from '../../data/invoiceTemplates';
import {
  LayoutTemplate, Save, Trash2, Lock, FileText,
} from 'lucide-react';

interface FormPanelProps {
  isViewer: boolean;
  editIndex: number | null;
  editRecord: RecordItem | null;
  availLabels: RecordItem[];
  isDuplicateCode: (code: string, excludeIndex?: number | null) => boolean;
  checkDuplicateCode: (code: string, excludeId?: string | null) => Promise<boolean>;
  onSubmit: (data: RecordItem) => Promise<void>;
  onCancel: () => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  customFields: CustomField[];
  serverMode: boolean;
  allTags: string[];
  loading: boolean;
  onFormChange: (data: RecordItem) => void;
  fieldSuggestions: Record<string, string[]>;
  templateName: string;
  setTemplateName: (n: string) => void;
  showTemplates: boolean;
  setShowTemplates: (s: boolean) => void;
  templates: Template[];
  handleSaveTemplate: () => void;
  handleLoadTemplate: (t: Template) => void;
  handleDeleteTemplate: (name: string) => void;
  templateKey: number;
  onAddTemplateCustomFields?: (fields: { key: string; label: string; fa: string; type: string }[]) => void;
}

export default function FormPanel({
  isViewer, editIndex, editRecord, availLabels,
  isDuplicateCode, checkDuplicateCode, onSubmit, onCancel,
  addToast, customFields, serverMode, allTags, loading,
  onFormChange, fieldSuggestions,
  templateName, setTemplateName,
  showTemplates, setShowTemplates,
  templates, handleSaveTemplate, handleLoadTemplate, handleDeleteTemplate,
  templateKey,
}: FormPanelProps) {
  if (isViewer) {
    return (
      <div className="fade-in">
        <div className="empty-state">
          <div className="empty-icon"><Lock className="h-10 w-10" /></div>
          <h3 style={{ marginBottom: '0.5rem' }}>دسترسی محدود</h3>
          <p style={{ opacity: 0.7 }}>شما دسترسی مشاهده دارید و نمی‌توانید رکورد جدید اضافه یا ویرایش کنید</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {!editIndex && (
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-outline btn-sm" onClick={() => setShowTemplates(p => !p)}>
              <LayoutTemplate className="h-4 w-4" /> الگوها
            </button>
            {templates.length > 0 && (
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>{templates.length} الگو</span>
            )}
          </div>
          <div className="d-flex gap-2 align-items-center">
            <input type="text" className="form-input" placeholder="نام الگو..."
              style={{ width: 150, marginBottom: 0 }}
              value={templateName} onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} />
            <button className="btn btn-outline btn-sm" onClick={handleSaveTemplate}>
              <Save className="h-4 w-4" /> ذخیره به عنوان الگو
            </button>
          </div>
        </div>
      )}
      {showTemplates && (
        <div className="form-card mb-4">
          <h4 style={{ marginBottom: '1rem' }}>الگوهای ذخیره شده</h4>
          {templates.length === 0 ? (
            <p style={{ opacity: 0.5, textAlign: 'center', padding: '1rem 0' }}>
              هنوز الگویی ذخیره نشده. ابتدا فیلدها را پر کنید و "ذخیره به عنوان الگو" را بزنید.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {templates.map((tmpl: Template, i: number) => (
                <div key={i} className="template-card" onClick={() => handleLoadTemplate(tmpl)}>
                  <LayoutTemplate className="h-6 w-6" style={{ color: tmpl.fields?.code ? 'var(--primary)' : 'var(--danger)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tmpl.fields?.project || (tmpl.fields?.code ? '' : 'نامعتبر - حذف کنید')}</div>
                  </div>
                  <Trash2 className="h-4 w-4 cursor-pointer opacity-50 hover:opacity-80 transition-opacity" style={{ color: 'var(--danger)' }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tmpl.name); }} />
                </div>
              ))}
            </div>
          )}

          <h4 style={{ margin: '1.5rem 0 1rem' }}>الگوهای پیش‌فرض فاکتور</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {INVOICE_TEMPLATES.map((tmpl, i) => (
              <div key={i} className="template-card" onClick={() => {
                const record: RecordItem = {
                  code: tmpl.fields.code || '',
                  project: tmpl.fields.project || '',
                  type: tmpl.fields.type || '',
                  date: tmpl.fields.date || '',
                  party: tmpl.fields.party || '',
                  amount: tmpl.fields.amount || '0',
                  related: [],
                  tags: [],
                  image: '',
                  color: '#7367f0',
                };
                if (tmpl.customFields) {
                  tmpl.customFields.forEach(cf => { (record as any)[cf.key] = ''; });
                  const missing = tmpl.customFields.filter(cf => !customFields.find(f => f.key === cf.key));
                  if (missing.length > 0 && onAddTemplateCustomFields) {
                    onAddTemplateCustomFields(missing);
                  }
                }
                handleLoadTemplate({ name: tmpl.name, fields: record });
              }}>
                <FileText className="h-6 w-6" style={{ color: '#10b981' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tmpl.description}</div>
                </div>
                {tmpl.customFields && tmpl.customFields.length > 0 && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.5, whiteSpace: 'nowrap' }}>
                    +{tmpl.customFields.length} فیلد
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <RecordForm
        key={editIndex !== null ? `edit-${editIndex}` : `add-${templateKey}`}
        editRecord={editRecord}
        editIndex={editIndex}
        availableLabels={availLabels}
        isDuplicateCode={isDuplicateCode}
        checkDuplicateCode={checkDuplicateCode}
        onSubmit={onSubmit}
        onCancel={onCancel}
        addToast={addToast}
        customFields={customFields}
        serverMode={serverMode}
        allTags={allTags}
        loading={loading}
        onFormChange={onFormChange}
        fieldSuggestions={fieldSuggestions}
      />
    </div>
  );
}
