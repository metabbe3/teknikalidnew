"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNotifications, useMarkNotificationsRead, notificationText } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications(!!session?.user);
  const markRead = useMarkNotificationsRead();

  if (!session?.user) return null;

  const unreadCount = data?.unreadCount ?? 0;

  function handleOpen() {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      markRead.mutate({ markAll: true });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors relative"
        aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-bearish text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-80 max-h-96 overflow-y-auto bg-bg-card depth-shadow-strong rounded-xl border border-border py-1 z-50">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Notifikasi</span>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead.mutate({ markAll: true }); }}
                  className="text-[10px] text-accent hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
            {data?.data.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-secondary">
                Belum ada notifikasi
              </div>
            ) : (
              data?.data.map((n) => (
                <Link
                  key={n.id}
                  href={n.post ? `/community/post/${n.post.id}` : `/profile/${n.actor.username}`}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 text-sm transition-colors ${
                    n.read ? "text-text-secondary" : "text-text-primary bg-accent/[0.03]"
                  } hover:bg-bg-hover`}
                >
                  <div className="flex items-start gap-2.5">
                    {n.actor.image ? (
                      <img src={n.actor.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                        {(n.actor.name || n.actor.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">{notificationText(n)}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
