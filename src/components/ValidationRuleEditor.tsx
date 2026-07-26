import { useState } from 'react';
import type { ValidationRule } from '../types';
import { Plus, Trash2, AlertTriangle, Check, X } from 'lucide-react';

const RULE_TYPES = [
  { value: 'required', label: 'ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±Ãƒâ€ºÃ…â€™', hint: 'Ãƒâ„¢Ã‚ÂÃƒâ€ºÃ…â€™Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ€ºÃ…â€™ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã‚Â¾ÃƒËœÃ‚Â± ÃƒËœÃ‚Â´Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯' },
  { value: 'regex', label: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒÅ¡Ã‚Â¯Ãƒâ„¢Ã‹â€  (Regex)', hint: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒÅ¡Ã‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ€ºÃ…â€™ regex ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§Ãƒâ€ºÃ…â€™ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬Ãƒâ€ºÃ…â€™' },
  { value: 'min', label: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±', hint: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯Ãƒâ€ºÃ…â€™' },
  { value: 'max', label: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚Â«ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±', hint: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚Â«ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¯Ãƒâ€ºÃ…â€™' },
  { value: 'minLength', label: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â·Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾', hint: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±' },
  { value: 'maxLength', label: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚Â«ÃƒËœÃ‚Â± ÃƒËœÃ‚Â·Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾', hint: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚Â«ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒÅ¡Ã‚Â©ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±' },
  { value: 'email', label: 'ÃƒËœÃ‚Â§Ãƒâ€ºÃ…â€™Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ€ºÃ…â€™Ãƒâ„¢Ã¢â‚¬Å¾', hint: 'ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬Ãƒâ€ºÃ…â€™ Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ€ºÃ…â€™Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ€ºÃ…â€™Ãƒâ„¢Ã¢â‚¬Å¾' },
];

interface Props {
  rules: ValidationRule[];
  onChange: (rules: ValidationRule[]) => void;
  fieldType: string;
}
export default function ValidationRuleEditor({ rules, onChange, fieldType }: Props) {
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState('required');
  const [newValue, setNewValue] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const addRule = () => {
    if (newType === 'required') {
      if (rules.some(r => r.type === 'required')) return;
      onChange([...rules, { type: 'required', message: 'Ã˜Â§Ã›Å’Ã™â€  Ã™ÂÃ›Å’Ã™â€žÃ˜Â¯ Ã˜Â¶Ã˜Â±Ã™Ë†Ã˜Â±Ã›Å’ Ã˜Â§Ã˜Â³Ã˜Âª' }]);
    } else {
      const rule: ValidationRule = {
        type: newType as ValidationRule['type'],
        value: newType === 'regex' ? newValue : (Number(newValue) || 0),
        message: newMessage || undefined,
      };
      onChange([...rules, rule]);
    }
    setAdding(false);
    setNewValue('');
    setNewMessage('');
    setNewType('required');
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const availableTypes = RULE_TYPES.filter(t => {
    if (fieldType === 'number') return ['required', 'min', 'max'].includes(t.value);
    if (fieldType === 'date') return ['required'].includes(t.value);
    if (fieldType === 'dropdown') return ['required'].includes(t.value);
    return true;
  });

  const getRuleSummary = (rule: ValidationRule) => {
    const t = RULE_TYPES.find(r => r.value === rule.type);
    if (!t) return rule.type;
    if (rule.type === 'required') return t.label;
    if (rule.type === 'email') return t.label;
    if (rule.type === 'regex') return t.label + ': /' + rule.value + '/';
    return t.label + ': ' + rule.value;
  };

  return (
    <div className="vre">
      {rules.length > 0 && (
        <div className="vre-rules">
          {rules.map((rule, i) => (
            <div key={i} className="vre-rule">
              <AlertTriangle className="vre-rule-icon" />
              <span className="vre-rule-text">{getRuleSummary(rule)}</span>
              {rule.message && <span className="vre-rule-msg"> -- {rule.message}</span>}
              <Trash2 className="vre-rule-remove" onClick={() => removeRule(i)} />
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="vre-add-form">
          <select className="vre-select" value={newType} onChange={e => setNewType(e.target.value)}>
            {availableTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {newType !== 'required' && newType !== 'email' && (
            <input
              type={newType === 'regex' ? 'text' : 'number'}
              className="vre-input"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder={newType === 'regex' ? '^[A-Z]+-[0-9]+$' : 'value...'}
            />
          )}

          <input
            type="text"
            className="vre-input"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Error message (optional)"
          />

          <button className="vre-btn primary" onClick={addRule} title="Add">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button className="vre-btn" onClick={() => setAdding(false)} title="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button className="vre-add-btn" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Validation Rule
        </button>
      )}

      <style>{`
        .vre { margin-top: 0.75rem; }
        .vre-rules { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 0.625rem; }
        .vre-rule { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.625rem; background: rgba(99, 102, 241, 0.04); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem; }
        .vre-rule-icon { width: 13px; height: 13px; color: var(--warning); flex-shrink: 0; }
        .vre-rule-text { font-weight: 500; }
        .vre-rule-msg { opacity: 0.55; }
        .vre-rule-remove { width: 14px; height: 14px; cursor: pointer; opacity: 0.3; margin-right: auto; transition: opacity 0.15s; flex-shrink: 0; }
        .vre-rule-remove:hover { opacity: 1; color: var(--danger); }
        .vre-add-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .vre-select { padding: 0.4rem 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-body); color: var(--text-color); font-size: 0.75rem; font-family: inherit; }
        .vre-input { padding: 0.4rem 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-body); color: var(--text-color); font-size: 0.75rem; font-family: inherit; min-width: 120px; flex: 1; }
        .vre-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color); font-size: 0.75rem; cursor: pointer; font-family: inherit; }
        .vre-btn.primary { background: var(--primary); color: white; border-color: var(--primary); }
        .vre-add-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: 6px; border: 1px dashed var(--border-color); background: transparent; color: var(--primary); font-size: 0.75rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .vre-add-btn:hover { border-color: var(--primary); background: rgba(99, 102, 241, 0.04); }
      `}</style>
    </div>
  );
}