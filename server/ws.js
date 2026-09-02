import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from './db.js';
import config from './config/env.js';

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

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

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket authenticated: ${socket.user.username} (${socket.id})`);

    socket.on('join-workspace', (workspaceId) => {
      // Only well-formed, positive integer workspace ids are accepted; room
      // membership is additionally gated by the workspace_members check below.
      const id = parseInt(workspaceId, 10);
      if (!Number.isInteger(id) || id <= 0) return;

      const membership = db.prepare(
        'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
      ).get(id, socket.user.id);

      if (membership) {
        socket.join(`workspace:${id}`);
        console.log(`Socket ${socket.id} (${socket.user.username}) joined workspace:${id}`);
      }
    });

    socket.on('leave-workspace', (workspaceId) => {
      if (workspaceId) {
        socket.leave(`workspace:${workspaceId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket disconnected: ${socket.user.username} (${socket.id})`);
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
