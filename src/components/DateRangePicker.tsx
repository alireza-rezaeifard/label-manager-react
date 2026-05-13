import { useState } from 'react';
import { DayPicker } from '@daypicker/persian';
import { faIR } from '@daypicker/persian';
import { toJalaliDate } from '../utils/formatters';

export default function DateRangePicker({
  dateFrom, dateTo, onDateFromChange, onDateToChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
}) {
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  return (
    <div className="date-range-picker">
      <div style={{ position: 'relative' }}>
        <input type="text" className="form-input" readOnly
          style={{ width: 130, marginBottom: 0, cursor: 'pointer', direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem' }}
          value={dateFrom} onClick={() => setShowFrom(p => !p)}
          placeholder="از تاریخ" />
        <i className="ti ti-calendar"
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
          onClick={(e) => { e.stopPropagation(); setShowFrom(p => !p); }}>
        </i>
        {showFrom && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
            <DayPicker locale={faIR} dir="rtl" mode="single"
              onSelect={(date) => { if (date) { onDateFromChange(toJalaliDate(date)); } setShowFrom(false); }}
            />
          </div>
        )}
      </div>
      <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>تا</span>
      <div style={{ position: 'relative' }}>
        <input type="text" className="form-input" readOnly
          style={{ width: 130, marginBottom: 0, cursor: 'pointer', direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem' }}
          value={dateTo} onClick={() => setShowTo(p => !p)}
          placeholder="تا تاریخ" />
        <i className="ti ti-calendar"
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
          onClick={(e) => { e.stopPropagation(); setShowTo(p => !p); }}>
        </i>
        {showTo && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
            <DayPicker locale={faIR} dir="rtl" mode="single"
              onSelect={(date) => { if (date) { onDateToChange(toJalaliDate(date)); } setShowTo(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
