import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Loader2, Tags } from 'lucide-react';

export default function LoginPage({ onLogin }: {
  onLogin: (user: any) => void;
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-3 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="sidebar-brand-icon mx-auto flex h-16 w-16 items-center justify-center text-2xl"
            >
              <Tags className="h-7 w-7" />
            </motion.div>
            <h2 className="text-xl font-bold">Label Studio</h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'ورود به حساب کاربری' : 'ایجاد حساب جدید'}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  className="text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="text-left"
                  dir="ltr"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال پردازش...
                  </>
                ) : mode === 'login' ? 'ورود' : 'ثبت نام'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-sm text-primary transition-colors hover:text-primary-hover hover:underline cursor-pointer bg-transparent border-none"
              >
                {mode === 'login' ? 'حساب ندارید؟ ثبت نام کنید' : 'قبلا ثبت نام کردهاید؟ وارد شوید'}
              </button>
            </div>

            <div className="mt-3 text-center">
              <button
                onClick={() => onLogin(null)}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline cursor-pointer bg-transparent border-none"
              >
                ادامه به صورت محلی (بدون سرور)
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
