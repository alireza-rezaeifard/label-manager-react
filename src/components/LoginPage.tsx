import { useState } from 'react';
import { api } from '../utils/api';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password);
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const btnBase = {
    width: '100%', padding: '1rem', borderRadius: 10, border: 'none',
    fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-body)', padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'var(--card-bg)',
        borderRadius: 20, padding: '2.5rem', border: '1px solid var(--border-color)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="sidebar-brand-icon" style={{ margin: '0 auto 1rem', width: 64, height: 64, fontSize: '2rem' }}>
            <i className="ti ti-tags"></i>
          </div>
          <h2 style={{ marginBottom: '0.25rem' }}>Label Studio</h2>
          <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>
            {mode === 'login' ? 'ورود به حساب کاربری' : 'ایجاد حساب جدید'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">نام کاربری</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              required
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">رمز عبور</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 0, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={btnBase}
            disabled={loading}
          >
            {loading ? '...' : mode === 'login' ? 'ورود' : 'ثبت نام'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
          >
            {mode === 'login' ? 'حساب ندارید؟ ثبت نام کنید' : 'قبلا ثبت نام کرده‌اید؟ وارد شوید'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={() => onLogin(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontFamily: 'inherit', fontSize: '0.8rem' }}
          >
            ادامه به صورت محلی (بدون سرور)
          </button>
        </div>
      </div>
    </div>
  );
}
