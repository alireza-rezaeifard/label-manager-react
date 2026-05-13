export default function LoadingScreen({ message = 'در حال بارگذاری...' }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-body)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="sidebar-brand-icon" style={{
          margin: '0 auto 1rem', width: 64, height: 64, fontSize: '2rem',
          animation: 'fadeIn 0.5s',
        }}>
          <i className="ti ti-loader"></i>
        </div>
        <p>{message}</p>
      </div>
    </div>
  );
}
