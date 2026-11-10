"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UhuMascot } from "./uhu-mascot";

export interface UhuMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

interface UhuChatPanelProps {
  open: boolean;
  onClose: () => void;
  pageContext?: string;
  onMessageCountChange?: (count: number) => void;
}

type GateState = "NONE" | "AUTH" | "NO_BINDING";

const STORAGE_KEY = "uhu_chat_history";
const MAX_STORED_MESSAGES = 20;

/** Parser markdown-lite (< 40 baris): hanya **bold** dan line-break (\n), tanpa dependensi. */
function renderLiteMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={lineIdx}>
        {parts.map((part, partIdx) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
            <strong key={partIdx} className="font-semibold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={partIdx}>{part}</span>
          )
        )}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function UhuChatPanel({
  open,
  onClose,
  pageContext,
  onMessageCountChange,
}: UhuChatPanelProps) {
  const { status: sessionStatus } = useSession();
  const [messages, setMessages] = useState<UhuMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UhuMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(-MAX_STORED_MESSAGES);
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [gate, setGate] = useState<GateState>("NONE");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const effectiveGate: GateState =
    sessionStatus === "unauthenticated" ? "AUTH" : gate;

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Simpan riwayat ke sessionStorage (maks 20 pesan) + lapor jumlah pesan ke parent
  useEffect(() => {
    onMessageCountChange?.(messages.length);
    const completed = messages.filter((m) => !m.streaming && m.text.trim().length > 0);
    if (completed.length === 0) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(completed.slice(-MAX_STORED_MESSAGES))
      );
    } catch {
      // ignore storage quota errors
    }
  }, [messages, onMessageCountChange]);

  // Cek status Live (/api/uhu GET -> /api/chat/status) saat panel dibuka
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/uhu", { method: "GET", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return { ok: false };
        return (await res.json()) as { ok?: boolean };
      })
      .then((data) => {
        if (!cancelled) setIsLive(Boolean(data?.ok));
      })
      .catch(() => {
        if (!cancelled) setIsLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Focus textarea saat panel dibuka + tombol Esc untuk tutup
  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // Auto-scroll ke bawah saat pesan bertambah / streaming
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streaming, errorBanner, effectiveGate, open]);

  // Cleanup stream saat unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-resize textarea (1 baris s/d maks 4 baris ~96px)
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 96; // ~4 baris
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    if (sessionStatus === "unauthenticated") {
      setGate("AUTH");
      return;
    }

    setErrorBanner(null);
    const userMsg: UhuMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setMessages((prev) => [
      ...prev.slice(-(MAX_STORED_MESSAGES - 2)),
      userMsg,
      { id: assistantId, role: "assistant", text: "", streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const removeEmptyAssistant = () => {
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantId && m.text.trim().length === 0))
      );
    };

    try {
      const res = await fetch("/api/uhu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          ...(pageContext ? { pageContext } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        removeEmptyAssistant();
        let errPayload: { error?: string; message?: string } = {};
        try {
          errPayload = (await res.json()) as { error?: string; message?: string };
        } catch {
          // ignore non-json
        }

        if (res.status === 401 || errPayload.error === "AUTH") {
          setGate("AUTH");
          return;
        }
        if (res.status === 409 || errPayload.error === "NO_BINDING") {
          setGate("NO_BINDING");
          return;
        }
        if (res.status === 429) {
          setErrorBanner(
            errPayload.message ||
              "Kuota tanya Uhu kamu sudah penuh untuk periode ini. Cek status paket di halaman Agent ya."
          );
          return;
        }
        if (
          res.status === 503 ||
          errPayload.error === "AGENT_OFFLINE" ||
          errPayload.error === "UHU_DISABLED"
        ) {
          setIsLive(false);
          setErrorBanner(
            "Uhu sedang istirahat sebentar (layanan AI belum aktif). Coba beberapa saat lagi ya."
          );
          return;
        }

        setErrorBanner(
          errPayload.message || "Maaf, koneksi ke Uhu sempat terputus. Coba kirim ulang ya."
        );
        return;
      }

      if (!res.body) {
        removeEmptyAssistant();
        setErrorBanner("Respons kosong dari server. Coba lagi sebentar ya.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processBlock = (rawBlock: string) => {
        const lines = rawBlock.split(/\r?\n/);
        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }

        if (dataLines.length === 0) return;
        const dataStr = dataLines.join("\n");

        let parsed: {
          t?: string;
          turnsUsed?: number;
          ok?: boolean;
          message?: string;
          error?: string;
        } | null = null;

        try {
          parsed = JSON.parse(dataStr);
        } catch {
          // Fallback bila data berupa plain text token
          if (eventName === "token") {
            parsed = { t: dataStr };
          }
        }

        if (!parsed) return;

        if (eventName === "error" || parsed.error) {
          const rawMsg = parsed.message || parsed.error || "";
          const friendly = /quota|limit|habis|429/i.test(rawMsg)
            ? "Kuota chat Uhu kamu sudah habis. Yuk cek atau upgrade paket di /agent."
            : rawMsg || "Maaf, Uhu mengalami kendala saat memproses pertanyaanmu.";
          setErrorBanner(friendly);
          return;
        }

        if (eventName === "token" || typeof parsed.t === "string") {
          const chunkText = parsed.t ?? "";
          if (chunkText) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + chunkText } : m
              )
            );
          }
        }

        if (eventName === "done") {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
          );
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          if (block.trim()) processBlock(block);
        }
      }

      if (buffer.trim()) {
        processBlock(buffer);
      }

      // Pastikan status streaming selesai & bersihkan bubble kosong bila ada error
      setMessages((prev) =>
        prev
          .map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
          .filter((m) => !(m.id === assistantId && m.text.trim().length === 0))
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      removeEmptyAssistant();
      setErrorBanner("Sambungan ke Uhu terganggu. Coba lagi sebentar ya.");
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, sessionStatus, pageContext]);

  if (!open) return null;

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
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
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
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity"
              >
                Buka Halaman Agent
              </Link>
              <Link
                href="/auth/signin"
                onClick={onClose}
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
                onClick={onClose}
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
                onClick={onClose}
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

      {/* Input bar */}
      <div className="border-t border-border bg-bg-card p-3">
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
                void sendMessage();
              }
            }}
            placeholder="Tanya Uhu apa aja..."
            aria-label="Pesan untuk Uhu"
            className="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
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
