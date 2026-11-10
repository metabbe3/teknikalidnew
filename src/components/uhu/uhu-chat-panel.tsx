"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { openNotifBell, useNotifUnread } from "@/components/layout/notif-bell";
import { UhuMascot } from "./uhu-mascot";
import { useUhu, type UhuMessage } from "./uhu-provider";

export type { UhuMessage };

/**
 * Linkify token di dalam segmen teks:
 * a) [label](url) -> <a href> (target="_blank" rel="noopener noreferrer" untuk http(s) eksternal)
 * b) Bare ticker /\b([A-Z]{4})(\.JK)?\b/ -> <a href="/stocks/{TICKER}.JK">
 */
function renderLinksAndTickers(segment: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenRe = /\[([^\]]+)\]\(([^)\s]+)\)|\b([A-Z]{4})(\.JK)?\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRe.exec(segment)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(segment.slice(lastIndex, match.index));
    }

    const mdLabel = match[1];
    const mdUrl = match[2];
    const bareTicker = match[3];

    if (mdLabel !== undefined && mdUrl !== undefined) {
      const isExternal = /^https?:\/\//i.test(mdUrl);
      const isInternal = mdUrl.startsWith("/");
      if (isExternal) {
        nodes.push(
          <a
            key={`${keyPrefix}-l-${tokenIdx}`}
            href={mdUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
          >
            {mdLabel}
          </a>
        );
      } else if (isInternal) {
        nodes.push(
          <a
            key={`${keyPrefix}-l-${tokenIdx}`}
            href={mdUrl}
            className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
          >
            {mdLabel}
          </a>
        );
      } else {
        nodes.push(match[0]);
      }
    } else if (bareTicker !== undefined) {
      const href = `/stocks/${bareTicker}.JK`;
      nodes.push(
        <a
          key={`${keyPrefix}-t-${tokenIdx}`}
          href={href}
          className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
        >
          {match[0]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
    tokenIdx += 1;
  }

  if (lastIndex < segment.length) {
    nodes.push(segment.slice(lastIndex));
  }

  return nodes;
}

/** Parser markdown-lite tanpa dependensi: **bold**, [label](url), bare ticker 4 huruf, dan \n. */
export function renderLiteMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={lineIdx}>
        {parts.map((part, partIdx) => {
          const keyPrefix = `${lineIdx}-${partIdx}`;
          if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return (
              <strong key={partIdx} className="font-semibold text-text-primary">
                {renderLinksAndTickers(part.slice(2, -2), keyPrefix)}
              </strong>
            );
          }
          return <span key={partIdx}>{renderLinksAndTickers(part, keyPrefix)}</span>;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function UhuChatPanel() {
  const {
    open,
    closeUhu,
    messages,
    input,
    setInput,
    streaming,
    isLive,
    effectiveGate,
    errorBanner,
    setErrorBanner,
    chips,
    send,
  } = useUhu();

  const notifUnread = useNotifUnread();
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea saat panel dibuka + tombol Esc untuk tutup
  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeUhu();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeUhu]);

  // Auto-scroll ke bawah saat pesan bertambah / streaming
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streaming, errorBanner, effectiveGate, open]);

  // Auto-resize textarea (1 baris s/d maks 4 baris ~96px)
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 96; // ~4 baris
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleSend = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    void send();
  }, [send]);

  const handleChipClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      void send(prompt);
    },
    [setInput, send]
  );

  if (!open) return null;

  const showChips = messages.length <= 1 && !streaming && chips.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Uhu — Analis AI TeknikalID"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-card shadow-xl md:inset-x-auto md:right-6 md:bottom-24 md:max-h-[540px] md:w-[380px] md:rounded-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-bg-card px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UhuMascot
            size={28}
            mood={streaming ? "thinking" : "happy"}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-text-primary">
                Uhu — Analis AI TeknikalID
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isLive
                    ? "bg-bullish-bg text-bullish"
                    : "bg-bg-tertiary text-text-tertiary"
                }`}
              >
                <span aria-hidden="true">●</span>
                {isLive ? "Live" : "Siaga"}
              </span>
              {notifUnread > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    closeUhu();
                    openNotifBell();
                  }}
                  title={`${notifUnread} notifikasi belum dibaca (buka lonceng header)`}
                  aria-label={`${notifUnread} notifikasi belum dibaca, buka lonceng notifikasi`}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-bg-hover transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-bearish"
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={closeUhu}
          aria-label="Tutup panel Uhu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 text-sm"
      >
        {effectiveGate === "AUTH" ? (
          <div className="rounded-xl border border-border bg-bg-primary p-4 space-y-3">
            <p className="text-sm font-semibold text-text-primary">
              Login dulu + hubungkan Telegram
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Uhu terhubung langsung dengan akun TeknikalID dan bot Telegram kamu
              supaya histori analisa &amp; kuota tersinkronisasi satu pintu.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href="/agent"
                onClick={closeUhu}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity"
              >
                Buka Halaman Agent
              </Link>
              <Link
                href="/auth/signin"
                onClick={closeUhu}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-card px-3.5 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover transition-colors"
              >
                Masuk Akun
              </Link>
            </div>
          </div>
        ) : effectiveGate === "NO_BINDING" ? (
          <div className="rounded-xl border border-border bg-bg-primary p-4 space-y-3">
            <p className="text-sm font-semibold text-text-primary">
              Hubungkan Telegram dulu yuk
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Akun web kamu belum terhubung ke Telegram Agent. Hubungkan sekali di
              halaman Agent supaya Uhu bisa langsung menjawab di web maupun Telegram.
            </p>
            <div className="pt-1">
              <Link
                href="/agent"
                onClick={closeUhu}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity"
              >
                Hubungkan Telegram di /agent
              </Link>
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="rounded-xl border border-border bg-bg-primary p-3.5 text-xs text-text-secondary leading-relaxed">
                Halo! Aku <strong className="font-semibold text-text-primary">Uhu</strong>, analis AI TeknikalID. Tanya soal sinyal teknikal, support/resistance, atau pergerakan saham IDX hari ini.
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-white leading-relaxed"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-bg-primary px-3.5 py-2.5 text-sm text-text-primary leading-relaxed"
                  }
                >
                  {msg.role === "user" ? (
                    <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                  ) : msg.text ? (
                    <div className="break-words">{renderLiteMarkdown(msg.text)}</div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                      <span>Uhu sedang menganalisa...</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {errorBanner && (
          <div
            role="status"
            className="rounded-xl border border-border bg-warning-bg px-3.5 py-2.5 text-xs text-text-primary flex items-start justify-between gap-2"
          >
            <div className="space-y-1">
              <p className="leading-relaxed">{errorBanner}</p>
              <Link
                href="/agent"
                onClick={closeUhu}
                className="inline-block font-semibold text-accent underline underline-offset-2"
              >
                Cek status di /agent
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label="Tutup pesan info"
              className="text-text-tertiary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Suggestion chips (quick actions kontekstual) */}
      {showChips && (
        <div
          aria-label="Saran pertanyaan cepat"
          className="flex items-center gap-1.5 overflow-x-auto border-t border-border bg-bg-card px-3 pt-2.5 pb-1"
        >
          {chips.slice(0, 3).map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={effectiveGate === "AUTH"}
              onClick={() => handleChipClick(chip.prompt)}
              className="shrink-0 whitespace-nowrap rounded-full border border-border bg-bg-primary px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:bg-bg-hover hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className={`${showChips ? "pt-1.5" : "border-t border-border"} bg-bg-card p-3`}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={streaming || effectiveGate === "AUTH"}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Tanya Uhu apa aja..."
            aria-label="Pesan untuk Uhu"
            className="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={streaming || !input.trim() || effectiveGate === "AUTH"}
            aria-label="Kirim pesan"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
