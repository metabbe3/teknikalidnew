"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    if (socketRef.current) return;

    // Dynamic import — socket.io-client (~30KB gzipped) is only loaded when authenticated
    import("socket.io-client").then(({ io }) => {
      const s = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 20,
      });
      socketRef.current = s;
      setSocket(s);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [status]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

/** Wrapper that only mounts SocketProvider for authenticated users */
export function ConditionalSocketProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();

  if (status === "authenticated") {
    return <SocketProvider>{children}</SocketProvider>;
  }

  return <>{children}</>;
}

export function useSocket() {
  return useContext(SocketContext);
}
