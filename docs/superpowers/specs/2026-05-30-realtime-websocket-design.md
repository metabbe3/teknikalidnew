# Real-Time WebSocket Layer (Socket.IO)

## Overview

Add a WebSocket layer using Socket.IO to push real-time updates to connected clients. Covers three feature areas: social notifications, stock price alerts, and presence/activity indicators.

## Architecture

```
User Action → Service → EventBus → Socket Bridge → Socket.IO → Client
                ↓
          Repository (DB write, unchanged)
```

The existing event bus (`src/lib/event-bus.ts`) already emits typed events for social actions. A new **socket bridge** subscribes to these events and forwards them as Socket.IO emissions to the appropriate rooms. No existing service or repository code changes — the socket layer is purely additive.

## Server Side

### Socket.IO Server

**File:** `src/lib/socket.ts`

Singleton Socket.IO server instance. Created once and attached to the custom Node HTTP server.

```ts
import { Server } from "socket.io";

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function initIO(httpServer: import("http").Server) {
  io = new Server(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", credentials: true },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("auth_required"));
    try {
      // Verify JWT using NextAuth secret
      const decoded = await verifyToken(token);
      socket.data.userId = decoded.sub;
      next();
    } catch {
      next(new Error("auth_failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on("join:stock", (ticker: string) => {
      socket.join(`stock:${ticker}`);
      const room = `stock:${ticker}`;
      const count = io!.sockets.adapter.rooms.get(room)?.size ?? 0;
      io!.to(room).emit("presence:update", { ticker, count });
    });

    socket.on("leave:stock", (ticker: string) => {
      socket.leave(`stock:${ticker}`);
      const room = `stock:${ticker}`;
      const count = io!.sockets.adapter.rooms.get(room)?.size ?? 0;
      io!.to(room).emit("presence:update", { ticker, count });
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("stock:")) {
          const ticker = room.slice(6);
          socket.leave(room);
          const count = io!.sockets.adapter.rooms.get(room)?.size ?? 0;
          io!.to(room).emit("presence:update", { ticker, count });
        }
      }
    });
  });

  return io;
}
```

### Server Entry Point

**File:** `server.ts` (modify existing or create if not present)

The standalone Next.js server needs to expose the underlying HTTP server so Socket.IO can attach:

```ts
import { createServer } from "http";
import { initIO } from "@/lib/socket";

const httpServer = createServer(nextApp.getRequestHandler());
initIO(httpServer);
httpServer.listen(port);
```

### Socket Bridge

**File:** `src/domains/notification/socket-bridge.ts`

Subscribes to existing eventBus events and forwards them through Socket.IO:

```ts
import { eventBus } from "@/lib/event-bus";
import { getIO } from "@/lib/socket";

export function initSocketBridge() {
  eventBus.on("community:post-liked", ({ authorId, ...payload }) => {
    getIO().to(`user:${authorId}`).emit("notification", { type: "LIKE", ...payload });
  });

  eventBus.on("community:comment-created", ({ authorId, ...payload }) => {
    getIO().to(`user:${authorId}`).emit("notification", { type: "COMMENT", ...payload });
  });

  eventBus.on("social:user-followed", ({ followedId, ...payload }) => {
    getIO().to(`user:${followedId}`).emit("notification", { type: "FOLLOW", ...payload });
  });

  eventBus.on("community:post-created", ({ tickerTag, ...payload }) => {
    if (tickerTag) {
      getIO().to(`stock:${tickerTag}`).emit("new-post", payload);
    }
  });
}
```

### Stock Alert Checker

**File:** `src/domains/stock/stock-alert.service.ts`

Called after intraday sync finishes. Checks if any watched stocks hit alert conditions:

```ts
import { getIO } from "@/lib/socket";
import { stockRepository } from "./stock.repository";
import { watchlistService } from "@/domains/watchlist/watchlist.service";

export const stockAlertService = {
  async checkAlerts(tickers: string[]) {
    for (const ticker of tickers) {
      const indicator = await stockRepository.findLatestIndicator(stock.id, "1d");
      if (!indicator) continue;

      const alerts: { type: string; message: string }[] = [];

      // RSI overbought/oversold
      if (indicator.rsi14 !== null) {
        if (indicator.rsi14 > 70) alerts.push({ type: "RSI_OVERBOUGHT", message: `RSI ${indicator.rsi14.toFixed(0)} — Overbought` });
        if (indicator.rsi14 < 30) alerts.push({ type: "RSI_OVERSOLD", message: `RSI ${indicator.rsi14.toFixed(0)} — Oversold` });
      }

      // SMA/EMA crosses
      if (indicator.smaCrossSignal) alerts.push({ type: "SMA_CROSS", message: `${indicator.smaCrossSignal === "golden_cross" ? "Golden Cross" : "Death Cross"}` });
      if (indicator.emaCrossSignal) alerts.push({ type: "EMA_CROSS", message: `${indicator.emaCrossSignal === "bullish" ? "Bullish" : "Bearish"} EMA Cross` });

      if (alerts.length > 0) {
        getIO().to(`stock:${ticker}`).emit("stock-alert", { ticker, alerts });
      }
    }
  },
};
```

Called from `data-sync.service.ts` at the end of `syncIntradayPrices`:

```ts
await stockAlertService.checkAlerts(tickers);
```

## Client Side

### Socket Provider

**File:** `src/components/providers/socket-provider.tsx`

React context that manages the Socket.IO client connection:

```tsx
"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;

    const s = io({
      auth: { token: session.accessToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [session?.accessToken]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
```

### Stock Room Hook

**File:** `src/hooks/use-stock-room.ts`

Manages joining/leaving stock rooms and tracking presence:

```ts
import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";

export function useStockRoom(ticker: string | null) {
  const socket = useSocket();
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!socket || !ticker) return;

    socket.emit("join:stock", ticker);

    const onPresence = ({ count }: { ticker: string; count: number }) => {
      setViewerCount(count);
    };
    socket.on("presence:update", onPresence);

    return () => {
      socket.emit("leave:stock", ticker);
      socket.off("presence:update", onPresence);
    };
  }, [socket, ticker]);

  return { viewerCount };
}
```

### Notification Hook

**File:** `src/hooks/use-realtime-notifications.ts`

Intercepts real-time notification events and merges them with React Query cache:

```ts
import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeNotifications() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    };

    socket.on("notification", onNotification);
    return () => { socket.off("notification", onNotification); };
  }, [socket, queryClient]);
}
```

### Stock Alert Hook

**File:** `src/hooks/use-stock-alerts.ts`

Listens for stock alerts in the current stock room:

```ts
import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";

interface StockAlert {
  ticker: string;
  alerts: { type: string; message: string }[];
}

export function useStockAlerts(ticker: string | null) {
  const socket = useSocket();
  const [latestAlert, setLatestAlert] = useState<StockAlert | null>(null);

  useEffect(() => {
    if (!socket || !ticker) return;

    const onAlert = (alert: StockAlert) => {
      if (alert.ticker === ticker) setLatestAlert(alert);
    };

    socket.on("stock-alert", onAlert);
    return () => { socket.off("stock-alert", onAlert); };
  }, [socket, ticker]);

  return { latestAlert };
}
```

## UI Components

### Presence Badge

Shown on stock detail page header:

```tsx
function PresenceBadge({ ticker }: { ticker: string }) {
  const { viewerCount } = useStockRoom(ticker);
  if (viewerCount <= 1) return null;
  return (
    <span className="text-xs text-text-tertiary flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      {viewerCount} orang sedang melihat
    </span>
  );
}
```

### Stock Alert Toast

Shown when a stock alert fires:

```tsx
function StockAlertBanner({ ticker }: { ticker: string }) {
  const { latestAlert } = useStockAlerts(ticker);
  if (!latestAlert) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-bg-card border border-border rounded-xl p-4 depth-shadow-strong animate-slide-up z-50">
      {latestAlert.alerts.map((a, i) => (
        <p key={i} className="text-sm">{a.message}</p>
      ))}
    </div>
  );
}
```

## Auth Integration

### JWT Token for Socket Auth

NextAuth JWT strategy already generates tokens. The socket client passes the session's `accessToken` as socket auth. The server verifies it using the same `NEXTAUTH_SECRET`.

If the current NextAuth setup doesn't expose `accessToken` in the session, add a JWT callback:

```ts
// In src/lib/auth.ts JWT callback:
async jwt({ token }) {
  token.accessToken = token.sessionToken; // or generate a dedicated socket token
  return token;
},
async session({ session, token }) {
  session.accessToken = token.accessToken as string;
  return session;
},
```

## Deployment

- Socket.IO runs on the same port as the Next.js app (no separate server needed)
- Docker standalone setup already uses a custom Node server — just attach Socket.IO to it
- No Redis adapter needed for single-instance deployment
- For multi-instance scaling, add `@socket.io/redis-adapter` later

## Fallback

- All existing REST API + polling for notifications stays unchanged
- If WebSocket connection fails, client gracefully falls back to polling
- Socket events are supplementary — the DB write + REST read is the source of truth

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/socket.ts` | Socket.IO server singleton + auth middleware |
| `src/domains/notification/socket-bridge.ts` | EventBus → Socket forwarding |
| `src/domains/stock/stock-alert.service.ts` | Post-sync alert condition checker |
| `src/components/providers/socket-provider.tsx` | React context for socket client |
| `src/hooks/use-stock-room.ts` | Join/leave stock rooms + presence |
| `src/hooks/use-realtime-notifications.ts` | Invalidate React Query on notification |
| `src/hooks/use-stock-alerts.ts` | Listen for stock alerts |
| `server.ts` | Modified: attach Socket.IO to HTTP server |

## Files Modified

| File | Change |
|------|--------|
| `src/domains/stock/data-sync.service.ts` | Call `stockAlertService.checkAlerts()` after sync |
| `src/app/(public)/stocks/[ticker]/page.tsx` | Add PresenceBadge component |
| `src/components/layout/header.tsx` | Add SocketProvider wrapper |
| `src/lib/auth.ts` | Expose accessToken in session for socket auth |
| `package.json` | Add `socket.io` + `socket.io-client` dependencies |
