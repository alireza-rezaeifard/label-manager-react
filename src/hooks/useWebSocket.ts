import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export function useWebSocket(
  workspaceId: number | null,
  onRecordsChanged: () => void
) {
  const socketRef = useRef<Socket | null>(null);
  const onRecordsChangedRef = useRef(onRecordsChanged);
  onRecordsChangedRef.current = onRecordsChanged;
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setConnectionStatus('connecting');
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      auth: { token },
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
      if (workspaceId) {
        socket.emit('join-workspace', workspaceId);
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err.message);
    });

    socket.on('record:created', () => onRecordsChangedRef.current());
    socket.on('record:updated', () => onRecordsChangedRef.current());
    socket.on('record:deleted', () => onRecordsChangedRef.current());
    socket.on('record:locked', () => onRecordsChangedRef.current());
    socket.on('record:unlocked', () => onRecordsChangedRef.current());
    socket.on('records:reordered', () => onRecordsChangedRef.current());
    socket.on('records:restored', () => onRecordsChangedRef.current());

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      if (socket.connected) {
        if (workspaceId) {
          socket.emit('leave-workspace', workspaceId);
        }
        socket.disconnect();
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    if (socketRef.current?.connected && workspaceId) {
      socketRef.current.emit('join-workspace', workspaceId);
    }
  }, [workspaceId]);

  const joinWorkspace = useCallback((wsId: number) => {
    socketRef.current?.emit('join-workspace', wsId);
  }, []);

  const leaveWorkspace = useCallback((wsId: number) => {
    socketRef.current?.emit('leave-workspace', wsId);
  }, []);

  return { joinWorkspace, leaveWorkspace, connectionStatus };
}
