import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { ToastType } from '../types';

interface AppState {
  theme: string;
  setTheme: (t: string) => void;
  toggleTheme: () => void;
  tab: string;
  setTab: (t: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  toggleSidebar: () => void;
  search: string;
  setSearch: (s: string) => void;
  toasts: ToastType[];
  addToast: (message: string, type?: ToastType['type']) => void;
  removeToast: (id: number) => void;
  localMode: boolean;
  serverMode: boolean;
  setServerMode: (m: boolean) => void;
  authUser: any;
  setAuthUser: (u: any) => void;
  setLocalMode: (m: boolean) => void;
  serverLoading: boolean;
  setServerLoading: (l: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState('records');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('local_mode') === 'true');
  const [authUser, setAuthUser] = useState(() => localMode ? null : (() => { try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; } })());
  const [serverMode, setServerMode] = useState(() => localMode ? false : !!localStorage.getItem('auth_token'));
  const [serverLoading, setServerLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: string) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState(p => p === 'light' ? 'dark' : 'light'), []);
  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

  const addToast = useCallback((message: string, type: ToastType['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!localStorage.getItem('auth_token')) {
        setServerMode(false);
        setAuthUser(null);
      }
    };
    window.addEventListener('auth-change', handler);
    return () => window.removeEventListener('auth-change', handler);
  }, []);

  return (
    <AppContext.Provider value={{
      theme, setTheme, toggleTheme,
      tab, setTab,
      sidebarOpen, setSidebarOpen, toggleSidebar,
      search, setSearch,
      toasts, addToast, removeToast,
      localMode, setLocalMode,
      serverMode, setServerMode,
      authUser, setAuthUser,
      serverLoading, setServerLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
