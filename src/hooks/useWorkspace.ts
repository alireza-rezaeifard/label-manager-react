import { useCallback } from 'react';
import { api } from '../utils/api';

interface WorkspaceDeps {
  serverMode: boolean;
  currentWorkspaceId: number | null;
  workspaces: any[];
  setServerMode: (m: boolean) => void;
  setAuthUser: (u: any) => void;
  setLocalMode: (m: boolean) => void;
  setWorkspaces: (ws: any[] | ((prev: any[]) => any[])) => void;
  setCurrentWorkspaceId: (id: number | null) => void;
  setServerLoading: (l: boolean) => void;
  setSelected: (s: Set<number>) => void;
  setTab: (t: string) => void;
  addToast: (...args: any[]) => void;
  invalidateCache: (pattern?: string) => void;
  fetchedRef: React.MutableRefObject<boolean>;
}

export function useWorkspace(deps: WorkspaceDeps) {
  const {
    serverMode, currentWorkspaceId, workspaces, setServerMode, setAuthUser,
    setLocalMode, setWorkspaces, setCurrentWorkspaceId,
    setServerLoading, setSelected, setTab, addToast,
    invalidateCache, fetchedRef,
  } = deps;

  const handleLogin = useCallback((user: any) => {
    if (user === null) {
      setLocalMode(true);
      localStorage.setItem('local_mode', 'true');
      setServerMode(false);
      setAuthUser(null);
      setTab('records');
    } else {
      setLocalMode(false);
      localStorage.setItem('local_mode', 'false');
      fetchedRef.current = false;
      setAuthUser(user);
      setServerMode(true);
      setTab('records');
      setServerLoading(true);
      api.getWorkspaces().then(wsList => {
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          const wsId = wsList[0].id;
          setCurrentWorkspaceId(wsId);
          localStorage.setItem('current_workspace_id', String(wsId));
        }
        setServerLoading(false);
      }).catch(() => setServerLoading(false));
    }
  }, [setLocalMode, setServerMode, setAuthUser, setTab, fetchedRef, setServerLoading, setWorkspaces, setCurrentWorkspaceId]);

  const handleLoginGoToServer = useCallback(() => {
    fetchedRef.current = false;
    setLocalMode(false);
    localStorage.removeItem('local_mode');
    setServerMode(false);
    setAuthUser(null);
    setTab('records');
  }, [fetchedRef, setLocalMode, setServerMode, setAuthUser, setTab]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    fetchedRef.current = false;
    setLocalMode(true);
    localStorage.setItem('local_mode', 'true');
    setServerMode(false);
    setAuthUser(null);
    setTab('records');
    addToast('خروج با موفقیت انجام شد', 'success');
  }, [fetchedRef, setLocalMode, setServerMode, setAuthUser, setTab, addToast]);

  const handleWorkspaceSwitch = useCallback((wsId: number) => {
    localStorage.setItem('current_workspace_id', String(wsId));
    setSelected(new Set());
    if (serverMode) {
      invalidateCache(`records:${currentWorkspaceId}`);
      setCurrentWorkspaceId(wsId);
    }
  }, [serverMode, currentWorkspaceId, setSelected, invalidateCache, setCurrentWorkspaceId]);

  const handleCreateWorkspace = useCallback(async (name: string, description: string) => {
    try {
      const ws = await api.createWorkspace(name, description);
      setWorkspaces((prev: any[]) => [...prev, ws]);
      handleWorkspaceSwitch(ws.id);
      addToast(`فضای کاری "${name}" ایجاد شد`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [setWorkspaces, handleWorkspaceSwitch, addToast]);

  const handleInviteMember = useCallback(async (wsId: number, username: string) => {
    try {
      await api.inviteToWorkspace(wsId, username);
      addToast(`کاربر "${username}" دعوت شد`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [addToast]);

  const handleLeaveWorkspace = useCallback(async (wsId: number) => {
    try {
      await api.leaveWorkspace(wsId);
      setWorkspaces((prev: any[]) => prev.filter((w: any) => w.id !== wsId));
      const remaining = workspaces.filter((w: any) => w.id !== wsId);
      if (remaining.length > 0) {
        handleWorkspaceSwitch(remaining[0].id);
      }
      addToast('خروج از فضای کاری با موفقیت انجام شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [workspaces, setWorkspaces, handleWorkspaceSwitch, addToast]);

  const handleDeleteWorkspace = useCallback(async (wsId: number) => {
    try {
      await api.deleteWorkspace(wsId);
      setWorkspaces((prev: any[]) => prev.filter((w: any) => w.id !== wsId));
      const remaining = workspaces.filter((w: any) => w.id !== wsId);
      if (remaining.length > 0) {
        handleWorkspaceSwitch(remaining[0].id);
      } else {
        setCurrentWorkspaceId(null);
      }
      addToast('فضای کاری حذف شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [workspaces, setWorkspaces, handleWorkspaceSwitch, setCurrentWorkspaceId, addToast]);

  return {
    handleLogin, handleLoginGoToServer, handleLogout,
    handleWorkspaceSwitch, handleCreateWorkspace,
    handleInviteMember, handleLeaveWorkspace, handleDeleteWorkspace,
  };
}
