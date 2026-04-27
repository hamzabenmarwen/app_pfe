import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

let io: SocketServer | null = null;

export function initRealtime(server: HttpServer): SocketServer {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5174'];

  io = new SocketServer(server, {
    path: '/socket.io',
    cors: {
      origin: origins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return next(new Error('JWT_ACCESS_SECRET not configured'));
    }

    try {
      const payload = jwt.verify(token, secret) as TokenPayload;
      (socket.data as any).user = payload;
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket.data as any).user as TokenPayload;

    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);

    socket.emit('realtime.connected', {
      userId: user.userId,
      role: user.role,
      timestamp: new Date().toISOString(),
    });
  });

  console.log('⚡ Realtime socket server initialized');
  return io;
}

export function emitRealtime(event: string, data: any, rooms: string[] = []): void {
  if (!io) return;

  // Prevent accidental broadcast: empty rooms is a no-op, not broadcast-all
  if (rooms.length === 0) {
    console.warn(`[emitRealtime] Attempted to emit "${event}" with no target rooms. Skipping.`);
    return;
  }

  // Only broadcast to all if explicitly requested with '__broadcast_all__' room
  if (rooms.length === 1 && rooms[0] === '__broadcast_all__') {
    io.emit(event, data);
    return;
  }

  rooms.forEach((room) => {
    io?.to(room).emit(event, data);
  });
}
