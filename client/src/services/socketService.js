import { io } from "socket.io-client";
import { getToken } from "../api.js";

let socket = null;

export function getSocket() {
  if (socket && socket.connected) return socket;
  if (socket) return socket;
  const token = getToken();
  if (!token) return null;
  socket = io("/", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
  });
  return socket;
}

export function onMessageNew(callback) {
  const s = getSocket();
  if (!s) return () => {};
  s.on("message:new", callback);
  return () => s.off("message:new", callback);
}
