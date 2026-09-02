import { createContext, useContext } from 'react';
import type { ToastType } from '../types';

/**
 * Shared app-level context shape.
 * Kept in its own module so the provider file only exports components
 * (react-refresh / HMR requirement).
 */
export interface AppState {
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

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
