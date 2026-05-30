import { Server } from "socket.io";
import { decode } from "next-auth/jwt";
import type { IncomingMessage } from "http";
import { SITE_URL } from "./constants";

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

async function authenticateSocket(
  req: IncomingMessage,
): Promise<string | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const token =
    cookies["authjs.session-token"] ??
    cookies["__Secure-authjs.session-token"];
  if (!token) return null;

  try {
    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
      salt: "authjs.session-token",
    });
    return (decoded?.id as string) ?? null;
  } catch {
    return null;
  }
}

export function initIO(httpServer: import("http").Server): Server {
  io = new Server(httpServer, {
    cors: {
      origin: [SITE_URL, "http://localhost:3000"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const userId = await authenticateSocket(socket.request);
    if (!userId) return next(new Error("auth_required"));
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("join:stock", (ticker: string) => {
      if (typeof ticker !== "string" || !ticker) return;
      socket.join(`stock:${ticker}`);
      broadcastPresence(`stock:${ticker}`, ticker);
    });

    socket.on("leave:stock", (ticker: string) => {
      if (typeof ticker !== "string" || !ticker) return;
      socket.leave(`stock:${ticker}`);
      broadcastPresence(`stock:${ticker}`, ticker);
    });

    socket.on("join:community", () => { socket.join("community"); });
    socket.on("leave:community", () => { socket.leave("community"); });

    socket.on("join:post", (postId: string) => {
      if (typeof postId !== "string" || !postId) return;
      socket.join(`post:${postId}`);
    });

    socket.on("leave:post", (postId: string) => {
      if (typeof postId !== "string" || !postId) return;
      socket.leave(`post:${postId}`);
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("stock:")) {
          broadcastPresence(room, room.slice(6));
        }
      }
    });
  });

  return io;
}

function broadcastPresence(room: string, ticker: string) {
  const count = io!.sockets.adapter.rooms.get(room)?.size ?? 0;
  io!.to(room).emit("presence:update", { ticker, count });
}
