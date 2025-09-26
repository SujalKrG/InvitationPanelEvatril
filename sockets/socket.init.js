// src/sockets/socket.init.js
import { Server } from "socket.io";
import { setIo } from "./socket.singleton.js";

/**
 * Initialize Socket.IO and store singleton via setIo(io).
 * Expects a http.Server instance (created with http.createServer(app)).
 */
export function initSockets(server, opts = {}) {
  // safety check to fail fast with a clear message
  if (!server || typeof server.listen !== "function") {
    throw new Error(
      "initSockets expects a http.Server instance. Call http.createServer(app) and pass the resulting server."
    );
  }

  // NOTE: pass the raw server (not the Server class)
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://127.0.0.1:5500",
      methods: ["GET", "POST"],
    },
    ...opts,
  });

  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    socket.on("join-event", (eventId) => {
      if (!eventId) return;
      socket.join(`event_${eventId}`);
    });

    socket.on("leave-event", (eventId) => {
      if (eventId) socket.leave(`event_${eventId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("socket disconnected:", socket.id, reason);
    });
  });

  setIo(io);
  return io;
}
