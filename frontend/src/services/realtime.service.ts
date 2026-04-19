import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

let socket: Socket | null = null;
let socketToken: string | null = null;

function getSocketUrl() {
  return import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';
}

export function connectRealtime(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  if (socket && socketToken && socketToken !== token) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }

  if (socket?.connected) return socket;

  socket = io(getSocketUrl(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: {
      token,
    },
  });
  socketToken = token;

  return socket;
}

export function disconnectRealtime(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}

export function getRealtimeSocket(): Socket | null {
  return socket;
}
