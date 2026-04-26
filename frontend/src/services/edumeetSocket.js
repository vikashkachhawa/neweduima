import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const createEduMeetSocket = (token) => io(`${WS_URL}/edumeet`, {
  auth: { token },
  path: '/socket.io',
  transports: ['polling'],
  upgrade: false,
  rememberUpgrade: false,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 20,
  timeout: 10000,
});
