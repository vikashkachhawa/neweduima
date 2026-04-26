/**
 * CodeArena interactive execution — Socket.io client factory
 *
 * Creates a socket connected to the /codearena namespace on the backend.
 * Each caller gets an independent socket instance; call disconnect() to clean up.
 *
 * Events emitted from the server:
 *   code:output  { type: 'stdout'|'stderr'|'system', text: string }
 *   code:done    { exitCode, executionTimeMs, timedOut, limitExceeded, killed }
 *   code:error   { message: string }
 *
 * Events sent to the server:
 *   code:run   { language, code }
 *   code:input { line }
 *   code:kill  (no payload)
 */

import { io } from 'socket.io-client';

// Backend WebSocket URL — uses same host as the API by default
const WS_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

/**
 * Create and return a new socket instance authenticated with the given JWT.
 * The socket connects immediately and remains connected until you call .disconnect().
 *
 * @param {string} token  JWT from localStorage('token')
 * @returns {import('socket.io-client').Socket}
 */
export function createExecutionSocket(token) {
  return io(`${WS_URL}/codearena`, {
    auth: { token },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 3,
    timeout: 10000,
  });
}
