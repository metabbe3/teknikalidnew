"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }, type === "error" ? 4000 : 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${t.exiting ? "toast-exit" : "toast-enter"} flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border min-w-[240px] max-w-[360px]`}
            style={{
              borderLeft: `3px solid ${t.type === "success" ? "var(--color-bullish)" : "var(--color-bearish)"}`,
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.04)",
            }}
          >
            <span
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{
                background:
                  t.type === "success" ? "var(--color-bullish)" : "var(--color-bearish)",
              }}
            >
              {t.type === "success" ? "✓" : "✗"}
            </span>
            <span className="text-sm text-gray-700 font-medium leading-snug">
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
