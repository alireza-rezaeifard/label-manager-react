import { Server } from 'socket.io';

let io;

export function initWebSocket(server, allowedOrigins) {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 30000,
    pingTimeout: 10000,
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    socket.on('join-workspace', (workspaceId) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
        console.log(`Socket ${socket.id} joined workspace:${workspaceId}`);
      }
    });

    socket.on('leave-workspace', (workspaceId) => {
      if (workspaceId) {
        socket.leave(`workspace:${workspaceId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('WebSocket not initialized');
  return io;
}

export function broadcastToWorkspace(workspaceId, event, data) {
  try {
    const srv = getIO();
    srv.to(`workspace:${workspaceId}`).emit(event, data);
  } catch {
    // WS not available
  }
}
