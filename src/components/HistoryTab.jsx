export default function HistoryTab({ printHistory, clearHistory }) {
  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <span style={{ opacity: 0.7 }}>
          {printHistory.length > 0 ? `${printHistory.length} بار چاپ انجام شده` : 'هنوز چاپی انجام نشده'}
        </span>
        {printHistory.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={clearHistory}>
            <i className="ti ti-trash"></i> پاک کردن تاریخچه
          </button>
        )}
      </div>

      {printHistory.length === 0 ? (
        <div className="history-empty">
          <i className="ti ti-history" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}></i>
          <p>تاریخچه چاپ خالی است</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {printHistory.map((entry, i) => (
            <div key={i} className="history-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="stat-icon info" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
                  <i className="ti ti-printer"></i>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>چاپ {entry.count} برچسب</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, direction: 'ltr' }}>{entry.date} - {entry.time}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: 300 }}>
                {entry.codes.map(code => (
                  <span key={code} style={{
                    padding: '0.15rem 0.5rem', background: 'rgba(115, 103, 240, 0.1)',
                    color: 'var(--primary)', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'monospace',
                  }}>{code}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
