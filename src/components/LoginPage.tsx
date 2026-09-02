import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2, Shield, Award, Star, BadgeCheck } from 'lucide-react';

export default function LoginPage({ onLogin }: {
  onLogin: (user: Record<string, unknown> | null) => void;
}) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password);
      localStorage.setItem('auth_token', result.token);
      if (result.refreshToken) localStorage.setItem('auth_refresh_token', result.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      toast.success(mode === 'login' ? 'خوش آمدید!' : 'حساب با موفقیت ایجاد شد');
      onLogin(result.user);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background decorative badges */}
      <div className="login-bg-badges">
        <motion.div
          className="bg-badge bg-badge-1"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Shield />
        </motion.div>
        <motion.div
          className="bg-badge bg-badge-2"
          animate={{ rotate: [0, -3, 3, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Award />
        </motion.div>
        <motion.div
          className="bg-badge bg-badge-3"
          animate={{ rotate: [0, 4, -4, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Star />
        </motion.div>
        <motion.div
          className="bg-badge bg-badge-4"
          animate={{ rotate: [0, -2, 2, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BadgeCheck />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="login-container"
      >
        <Card className="login-card">
          <CardContent className="login-card-content">
            {/* Classic header with badge emblem */}
            <div className="login-header">
              <motion.div
                className="login-emblem"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 }}
              >
                <div className="emblem-outer">
                  <div className="emblem-inner">
                    <Shield className="emblem-icon" />
                  </div>
                </div>
                <div className="emblem-rays" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <h1 className="login-title">Label Studio</h1>
                <div className="login-divider">
                  <span className="divider-line" />
                  <span className="divider-diamond" />
                  <span className="divider-line" />
                </div>
                <p className="login-subtitle">
                  {mode === 'login' ? 'ورود به حساب کاربری' : 'ایجاد حساب جدید'}
                </p>
              </motion.div>
            </div>

            {/* Classic badge tabs for login/register */}
            <div className="login-mode-tabs">
              <button
                className={`mode-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setError(''); }}
              >
                <Shield className="mode-tab-icon" />
                <span>ورود</span>
              </button>
              <button
                className={`mode-tab ${mode === 'register' ? 'active' : ''}`}
                onClick={() => { setMode('register'); setError(''); }}
              >
                <Award className="mode-tab-icon" />
                <span>ثبت نام</span>
              </button>
            </div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="login-form"
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="form-field">
                <Label htmlFor="username" className="field-label">
                  <span className="label-badge">1</span>
                  نام کاربری
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  className="classic-input"
                  dir="ltr"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="password" className="field-label">
                  <span className="label-badge">2</span>
                  رمز عبور
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="classic-input"
                  dir="ltr"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="login-error"
                >
                  <AlertCircle className="error-icon" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button type="submit" className="classic-submit" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4" />
                    {mode === 'login' ? 'ورود' : 'ثبت نام'}
                  </>
                )}
              </Button>
            </motion.form>

            {/* Classic footer */}
            <div className="login-footer">
              <div className="footer-ornament">
                <span className="ornament-star">&#10038;</span>
              </div>
              <button
                onClick={() => onLogin(null)}
                className="local-mode-btn"
              >
                ادامه به صورت محلی (بدون سرور)
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          background: var(--bg-body);
        }

        /* Background decorative badges */
        .login-bg-badges {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .bg-badge {
          position: absolute;
          opacity: 0.04;
          color: var(--primary);
        }

        .bg-badge svg {
          width: 100%;
          height: 100%;
        }

        .bg-badge-1 {
          top: 10%;
          left: 8%;
          width: 180px;
          height: 180px;
        }

        .bg-badge-2 {
          top: 15%;
          right: 10%;
          width: 140px;
          height: 140px;
        }

        .bg-badge-3 {
          bottom: 15%;
          left: 12%;
          width: 120px;
          height: 120px;
        }

        .bg-badge-4 {
          bottom: 10%;
          right: 8%;
          width: 160px;
          height: 160px;
        }

        /* Container */
        .login-container {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }

        /* Card */
        .login-card {
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.03),
            0 4px 8px rgba(0, 0, 0, 0.04),
            0 12px 32px rgba(0, 0, 0, 0.06);
          border-radius: 16px;
          overflow: visible;
        }

        .login-card-content {
          padding: 2.5rem 2rem 2rem;
        }

        /* Header */
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        /* Emblem - classic badge shape */
        .login-emblem {
          position: relative;
          width: 88px;
          height: 88px;
          margin: 0 auto 1.25rem;
        }

        .emblem-outer {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(145deg, var(--primary), #14b8a6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 16px rgba(15, 118, 110, 0.3),
            0 0 0 4px var(--card-bg),
            0 0 0 6px var(--primary);
          position: relative;
          z-index: 2;
        }

        .emblem-inner {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(145deg, #14b8a6, var(--primary));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emblem-icon {
          width: 28px;
          height: 28px;
          color: white;
        }

        .emblem-rays {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px dashed var(--primary);
          opacity: 0.2;
          animation: spin 20s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Title */
        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-color);
          letter-spacing: -0.02em;
          margin-bottom: 0.75rem;
        }

        /* Classic divider */
        .login-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .divider-line {
          width: 48px;
          height: 1px;
          background: var(--border-color);
        }

        .divider-diamond {
          width: 6px;
          height: 6px;
          background: var(--primary);
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        .login-subtitle {
          font-size: 0.875rem;
          color: var(--text-color);
          opacity: 0.55;
        }

        /* Mode tabs - badge style */
        .login-mode-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.75rem;
          background: var(--hover-bg);
          padding: 0.375rem;
          border-radius: 12px;
        }

        .mode-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-color);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: inherit;
          opacity: 0.55;
        }

        .mode-tab:hover {
          opacity: 0.8;
        }

        .mode-tab.active {
          background: var(--card-bg);
          color: var(--primary);
          opacity: 1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .mode-tab-icon {
          width: 16px;
          height: 16px;
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-color);
        }

        .label-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--hover-bg);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--primary);
        }

        .classic-input {
          height: 44px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.875rem;
          transition: all 0.2s ease;
          padding: 0 1rem;
        }

        .classic-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        .classic-input::placeholder {
          color: var(--text-color);
          opacity: 0.3;
        }

        /* Error */
        .login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: var(--danger);
          font-size: 0.8125rem;
        }

        .error-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        /* Submit button */
        .classic-submit {
          height: 46px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          background: linear-gradient(145deg, var(--primary), #14b8a6);
          color: white;
          border: none;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.3);
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .classic-submit:hover {
          box-shadow: 0 6px 20px rgba(15, 118, 110, 0.4);
          transform: translateY(-1px);
        }

        .classic-submit:active {
          transform: translateY(0);
        }

        .classic-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Footer */
        .login-footer {
          margin-top: 1.75rem;
          text-align: center;
        }

        .footer-ornament {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .ornament-star {
          color: var(--primary);
          opacity: 0.25;
          font-size: 0.75rem;
        }

        .local-mode-btn {
          background: none;
          border: none;
          color: var(--text-color);
          opacity: 0.45;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
        }

        .local-mode-btn:hover {
          opacity: 0.75;
          background: var(--hover-bg);
        }

        /* Responsive */
        @media (max-width: 480px) {
          .login-card-content {
            padding: 2rem 1.5rem 1.5rem;
          }

          .bg-badge-1, .bg-badge-4 {
            width: 100px;
            height: 100px;
          }

          .bg-badge-2, .bg-badge-3 {
            width: 80px;
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
}
