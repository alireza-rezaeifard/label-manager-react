import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useWebSocket(
  workspaceId: number | null,
  onRecordsChanged: () => void
) {
  const socketRef = useRef<Socket | null>(null);
  const onRecordsChangedRef = useRef(onRecordsChanged);
  onRecordsChangedRef.current = onRecordsChanged;

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: { token },
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err.message);
    });

    socket.on('connect', () => {
      if (workspaceId) {
        socket.emit('join-workspace', workspaceId);
      }
    });

    socket.on('record:created', () => onRecordsChangedRef.current());
    socket.on('record:updated', () => onRecordsChangedRef.current());
    socket.on('record:deleted', () => onRecordsChangedRef.current());
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

  return { joinWorkspace, leaveWorkspace };
}
