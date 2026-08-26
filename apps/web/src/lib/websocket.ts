"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("coopgig_token")
      : null;

  socket = io(url, {
    path: "/ws",
    auth: { token },
    autoConnect: false,
  });

  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
