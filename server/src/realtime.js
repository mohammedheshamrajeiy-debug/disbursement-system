import { Server } from 'socket.io';
import { getSession } from './authStore.js';

let io = null;

export function getIO() {
  return io;
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token || '';
    const session = token ? getSession(String(token)) : null;
    if (!session) return next(new Error('unauthorized'));
    socket.data.session = session;
    next();
  });

  io.on('connection', (socket) => {
    const tabs = (socket.data.session && socket.data.session.tabs) || [];

    const joinTab = (tabId) => {
      if (typeof tabId === 'string' && tabId && tabs.includes(tabId)) {
        socket.join(`tab:${tabId}`);
      }
    };

    // Client declares which tab(s) it is currently using
    tabs.forEach((tab) => joinTab(tab));
    socket.on('join', joinTab);

    socket.on('disconnect', () => {});
  });

  return io;
}

export function emitToTabs(tabs, event, payload) {
  if (!io) return;
  (Array.isArray(tabs) ? tabs : [tabs]).forEach((tab) => {
    if (tab) io.to(`tab:${tab}`).emit(event, payload);
  });
}

export function emitBroadcast(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}
