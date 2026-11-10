"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";

export type NotifKind = "blast" | "pulse" | "alert" | "uhu";

export interface NotifItem {
  id: number | string;
  kind: NotifKind;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  read: boolean;
}

interface NotifResponse {
  unread: number;
  items: NotifItem[];
}

const POLL_INTERVAL_MS = 60_000;

// Shared lightweight store supaya komponen lain (mis. header UhuChatPanel)
// dapat membaca angka unread dari satu pintu (NotifBell) tanpa fetch/poll ganda.
let sharedUnreadCount = 0;
const unreadListeners = new Set<() => void>();
let openBellCallback: (() => void) | null = null;

function setSharedUnreadCount(next: number) {
  const normalized = Math.max(0, Math.floor(next || 0));
  if (sharedUnreadCount === normalized) return;
  sharedUnreadCount = normalized;
  for (const listener of unreadListeners) {
    listener();
  }
}

function subscribeUnread(listener: () => void) {
  unreadListeners.add(listener);
  return () => {
    unreadListeners.delete(listener);
  };
}

function getUnreadSnapshot() {
  return sharedUnreadCount;
}

function getUnreadServerSnapshot() {
  return 0;
}

export function useNotifUnread(): number {
  return useSyncExternalStore(
    subscribeUnread,
    getUnreadSnapshot,
    getUnreadServerSnapshot
  );
}

export function openNotifBell(): void {
  openBellCallback?.();
}

export function formatRelativeTimeId(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function renderKindSymbol(kind: NotifKind) {
  switch (kind) {
    case "blast":
      return (
        <span
          aria-hidden="true"
          data-kind="blast"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[10px] leading-none text-bearish"
          title="Blast"
        >
          🔴
        </span>
      );
    case "pulse":
      return (
        <span
          aria-hidden="true"
          data-kind="pulse"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[11px] leading-none"
          title="Pulse"
        >
          📊
        </span>
      );
    case "uhu":
      return (
        <span
          aria-hidden="true"
          data-kind="uhu"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[11px] leading-none"
          title="Uhu menjawab"
        >
          🦉
        </span>
      );
    case "alert":
    default:
      return (
        <span
          aria-hidden="true"
          data-kind="alert"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[11px] leading-none text-amber-500"
          title="Alert"
        >
          ⚡
        </span>
      );
  }
}

export function NotifBell() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthed = status === "authenticated" && Boolean(session?.user);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const updateUnread = useCallback((next: number) => {
    const val = Math.max(0, next);
    setUnread(val);
    setSharedUnreadCount(val);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthed) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    try {
      const res = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<NotifResponse>;
      const nextItems = Array.isArray(data.items) ? data.items : [];
      const nextUnread =
        typeof data.unread === "number"
          ? data.unread
          : nextItems.filter((i) => !i.read).length;
      setItems(nextItems);
      updateUnread(nextUnread);
    } catch {
      // Abaikan kegagalan jaringan sementara pada background poll
    }
  }, [isAuthed, updateUnread]);

  // Registrasi callback pembuka panel untuk pointer dari UhuChatPanel
  useEffect(() => {
    if (!isAuthed) {
      setSharedUnreadCount(0);
      openBellCallback = null;
      return;
    }
    openBellCallback = () => {
      setOpen(true);
      triggerRef.current?.focus();
    };
    return () => {
      openBellCallback = null;
    };
  }, [isAuthed]);

  // Poll ringan tiap 60s saat tab visible; hentikan interval saat tab hidden
  useEffect(() => {
    if (!isAuthed) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let initialTimerId: ReturnType<typeof setTimeout> | null = null;

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          void fetchNotifications();
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (document.visibilityState === "visible") {
      initialTimerId = setTimeout(() => {
        void fetchNotifications();
      }, 0);
      startPolling();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchNotifications();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (initialTimerId !== null) clearTimeout(initialTimerId);
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthed, fetchNotifications]);

  const closePanel = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // ESC close + focus trap ringan saat panel terbuka (pola GuestSellModal)
  useEffect(() => {
    if (!open) return;

    const panelEl = panelRef.current;
    const getFocusables = () =>
      panelEl
        ? Array.from(
            panelEl.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          )
        : [];

    const initialFocusables = getFocusables();
    if (initialFocusables.length > 0) {
      initialFocusables[0].focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
        return;
      }
      if (e.key === "Tab") {
        const focusables = getFocusables();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  const handleMarkAllRead = useCallback(async () => {
    if (unread === 0 && items.every((i) => i.read)) return;
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    updateUnread(0);

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read" }),
        cache: "no-store",
      });
    } catch {
      // Abaikan error jaringan
    }
  }, [unread, items, updateUnread]);

  const handleItemClick = useCallback(
    (item: NotifItem) => {
      if (!item.read) {
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
        updateUnread(Math.max(0, unread - 1));

        void fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark-read", id: item.id }),
          cache: "no-store",
          keepalive: true,
        }).catch(() => undefined);
      }

      setOpen(false);

      // Notif jawaban Uhu → buka panel Uhu (bukan navigate): jawaban langsung
      // ter-restore dari history server (owner 10 Nov "notif ada tapi gak muncul di Uhu").
      if ((item.kind as string) === "uhu") {
        window.dispatchEvent(new CustomEvent("uhu:open"));
        return;
      }

      const targetUrl = item.url?.trim();
      if (targetUrl) {
        if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
          router.push(targetUrl);
        } else {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      }
    },
    [unread, updateUnread, router]
  );

  // Guest / belum login: JANGAN render bell sama sekali
  if (!isAuthed) return null;

  const badgeLabel = unread > 9 ? "9+" : String(unread);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifikasi (${unread} belum dibaca)`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span
            data-testid="notif-bell-badge"
            className="absolute top-1 right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-bearish px-1 text-[9px] font-bold leading-none text-white"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop: gelap lembut di mobile bottom-sheet, transparan klik-luar di desktop */}
          <div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none"
            onClick={closePanel}
            aria-hidden="true"
          />

          {/* Panel: bottom-sheet max-w-md di mobile (<sm), dropdown di desktop (>=sm) */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Panel notifikasi"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[75dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-card shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[26rem] sm:w-96 sm:max-w-md sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  Notifikasi
                </span>
                {unread > 0 && (
                  <span className="rounded-full bg-bearish/10 px-2 py-0.5 text-[11px] font-semibold text-bearish">
                    {unread} baru
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Tutup notifikasi"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            {/* List notifikasi */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-secondary">
                  Belum ada notifikasi
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-bg-hover ${
                      item.read ? "bg-transparent opacity-80" : "bg-accent/[0.04]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{renderKindSymbol(item.kind)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              item.read
                                ? "font-normal text-text-secondary"
                                : "font-semibold text-text-primary"
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="shrink-0 text-[11px] text-text-tertiary">
                            {formatRelativeTimeId(item.createdAt)}
                          </span>
                        </div>
                        {item.body && (
                          <p className="mt-0.5 truncate text-xs text-text-secondary">
                            {item.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-bg-card px-4 py-2.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={unread === 0}
                className="text-xs font-medium text-accent transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-45 disabled:no-underline"
              >
                Tandai semua dibaca
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
