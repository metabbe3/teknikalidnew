"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export interface UhuMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

export type GateState = "NONE" | "AUTH" | "NO_BINDING";

export interface UhuSuggestionChip {
  label: string;
  prompt: string;
}

export interface UhuContextValue {
  open: boolean;
  setOpen: (open: boolean, pageContextOverride?: string) => void;
  openUhu: (pageContextOverride?: string) => void;
  closeUhu: () => void;
  messages: UhuMessage[];
  input: string;
  setInput: (value: string) => void;
  streaming: boolean;
  isLive: boolean;
  gate: GateState;
  effectiveGate: GateState;
  isGuest: boolean;
  errorBanner: string | null;
  setErrorBanner: (value: string | null) => void;
  unreadWhileClosed: boolean;
  pageContext: string | undefined;
  setPageContext: (ctx: string | undefined) => void;
  chips: UhuSuggestionChip[];
  send: (textOverride?: string, pageContextOverride?: string) => Promise<void>;
}

const STORAGE_KEY = "uhu_chat_history";
const MAX_STORED_MESSAGES = 20;

function formatTickerJk(raw: string): string {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return "";
  return cleaned.endsWith(".JK") ? cleaned : `${cleaned}.JK`;
}

function extractStockTickerFromPath(pathname: string | null, customCtx?: string): string | null {
  if (pathname) {
    const match = pathname.match(/^\/stocks\/([^/?#]+)/);
    if (match && match[1]) {
      try {
        return formatTickerJk(decodeURIComponent(match[1]));
      } catch {
        return formatTickerJk(match[1]);
      }
    }
  }
  if (customCtx) {
    const subMatch = customCtx.match(/^\/stocks\/([^/?#]+)/);
    if (subMatch && subMatch[1]) {
      return formatTickerJk(subMatch[1]);
    }
    if (/^[A-Za-z]{4}(\.JK)?$/i.test(customCtx.trim())) {
      return formatTickerJk(customCtx);
    }
  }
  return null;
}

export function buildSuggestionChips(
  pathname: string | null,
  customPageContext?: string
): UhuSuggestionChip[] {
  const ticker = extractStockTickerFromPath(pathname, customPageContext);
  if (ticker) {
    return [
      {
        label: "📊 Analisa saham ini",
        prompt: `Analisa teknikal ${ticker} dong, singkat`,
      },
      {
        label: "⚖️ Bandingkan vs saham lain",
        prompt: `Bandingkan ${ticker} dengan rival terdekatnya`,
      },
      {
        label: "📰 Ada berita soal ini?",
        prompt: `Ada berita terbaru soal ${ticker}?`,
      },
    ];
  }

  if (pathname === "/pasar" || pathname === "/") {
    return [
      {
        label: "🕐 Sesi pasar sekarang gimana?",
        prompt: "Sesi pasar sekarang gimana?",
      },
      {
        label: "🔥 Top sinyal hari ini",
        prompt: "Top sinyal hari ini",
      },
    ];
  }

  if (pathname && pathname.startsWith("/berita")) {
    return [
      {
        label: "📌 Ringkas berita penting hari ini",
        prompt: "Ringkas berita penting hari ini",
      },
    ];
  }

  return [
    {
      label: "💡 Tanya apa aja soal saham",
      prompt: "Tanya apa aja soal saham",
    },
  ];
}

const UhuContext = createContext<UhuContextValue | null>(null);

const NOOP_CONTEXT: UhuContextValue = {
  open: false,
  setOpen: () => {},
  openUhu: () => {},
  closeUhu: () => {},
  messages: [],
  input: "",
  setInput: () => {},
  streaming: false,
  isLive: false,
  gate: "NONE",
  effectiveGate: "AUTH",
  isGuest: true,
  errorBanner: null,
  setErrorBanner: () => {},
  unreadWhileClosed: false,
  pageContext: undefined,
  setPageContext: () => {},
  chips: [{ label: "💡 Tanya apa aja soal saham", prompt: "Tanya apa aja soal saham" }],
  send: async () => {},
};

export function useUhu(): UhuContextValue {
  const ctx = useContext(UhuContext);
  return ctx ?? NOOP_CONTEXT;
}

export function UhuProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();

  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);

  const [customCtxState, setCustomCtxState] = useState<{
    forPath: string | null;
    value: string | undefined;
  }>({ forPath: null, value: undefined });

  const customPageContext =
    customCtxState.forPath === pathname ? customCtxState.value : undefined;

  const setCustomPageContext = useCallback(
    (value: string | undefined) => {
      setCustomCtxState({ forPath: pathname, value });
    },
    [pathname]
  );

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
  const [isLive, setIsLive] = useState(false);
  const [gate, setGate] = useState<GateState>("NONE");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [unreadWhileClosed, setUnreadWhileClosed] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const effectiveGate: GateState =
    sessionStatus === "unauthenticated"
      ? "AUTH"
      : sessionStatus === "authenticated" && gate === "AUTH"
        ? "NONE"
        : gate;

  const isGuest: boolean =
    sessionStatus !== "authenticated" || effectiveGate === "AUTH";

  // Normalisasi pageContext agar agentd aware halaman aktif:
  // "/stocks/BBCA.JK" → "BBCA.JK" (ticker → grounding auto), pathname lain apa adanya.
  const rawPageContext = customPageContext ?? pathname ?? undefined;
  const pageContext = (() => {
    if (!rawPageContext) return undefined;
    const m = rawPageContext.match(/^\/(?:stocks|saham)\/([A-Za-z]{4}(?:\.JK)?)$/);
    if (m) return m[1].toUpperCase().includes(".JK") ? m[1].toUpperCase() : `${m[1].toUpperCase()}.JK`;
    return rawPageContext;
  })();

  const chips = useMemo(
    () => buildSuggestionChips(pathname, customPageContext),
    [pathname, customPageContext]
  );

  const setOpen = useCallback(
    (nextOpen: boolean, pageContextOverride?: string) => {
      openRef.current = nextOpen;
      if (pageContextOverride !== undefined) {
        setCustomCtxState({ forPath: pathname, value: pageContextOverride });
      }
      setOpenState(nextOpen);
      if (nextOpen) {
        setUnreadWhileClosed(false);
      }
    },
    [pathname]
  );

  const openUhu = useCallback(
    (pageContextOverride?: string) => {
      setOpen(true, pageContextOverride);
    },
    [setOpen]
  );

  const closeUhu = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  // Simpan riwayat ke sessionStorage (maks 20 pesan)
  useEffect(() => {
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
  }, [messages]);

  // Cek status Live (/api/uhu GET -> /api/chat/status) saat mount dan saat panel dibuka
  useEffect(() => {
    let cancelled = false;
    fetch("/api/uhu", { method: "GET", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          if (!cancelled) setGate("AUTH");
          return { ok: false };
        }
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

  // Hanya abort saat provider unmount (TIDAK saat panel ditutup agar async completion tetap jalan)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (textOverride?: string, pageContextOverride?: string) => {
      const rawText = typeof textOverride === "string" ? textOverride : input;
      const trimmed = rawText.trim();
      if (!trimmed || streaming) return;

      if (sessionStatus === "unauthenticated") {
        setGate("AUTH");
        return;
      }

      const activeContext = pageContextOverride ?? pageContext;

      setErrorBanner(null);
      const userMsg: UhuMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: trimmed,
      };
      const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      setInput("");

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

      let aborted = false;

      try {
        const res = await fetch("/api/uhu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            ...(activeContext ? { pageContext: activeContext } : {}),
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
        if (err instanceof Error && err.name === "AbortError") {
          aborted = true;
          return;
        }
        removeEmptyAssistant();
        setErrorBanner("Sambungan ke Uhu terganggu. Coba lagi sebentar ya.");
      } finally {
        setStreaming(false);
        if (!aborted && !openRef.current) {
          setUnreadWhileClosed(true);
        }
      }
    },
    [input, streaming, sessionStatus, pageContext]
  );

  const value = useMemo<UhuContextValue>(
    () => ({
      open,
      setOpen,
      openUhu,
      closeUhu,
      messages,
      input,
      setInput,
      streaming,
      isLive,
      gate,
      effectiveGate,
      isGuest,
      errorBanner,
      setErrorBanner,
      unreadWhileClosed,
      pageContext,
      setPageContext: setCustomPageContext,
      chips,
      send,
    }),
    [
      open,
      setOpen,
      openUhu,
      closeUhu,
      messages,
      input,
      streaming,
      isLive,
      gate,
      effectiveGate,
      isGuest,
      errorBanner,
      unreadWhileClosed,
      pageContext,
      setCustomPageContext,
      chips,
      send,
    ]
  );

  return <UhuContext.Provider value={value}>{children}</UhuContext.Provider>;
}

/**
 * Tombol pembuka Uhu di halaman saham (Stock page / TickerFab / StockCard).
 * Selalu membuka panel Uhu dengan pageContext=ticker.
 */
export function UhuStockTrigger({
  ticker,
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  ticker?: string;
  children: ReactNode;
}) {
  const { openUhu, pageContext } = useUhu();
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        openUhu(ticker ?? pageContext);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * CTA "Tanya AI" untuk halaman non-saham (mis. /pasar, /, /indeks, /berita):
 * - Logged-in: klik membuka panel Uhu.
 * - Guest: tetap link ke /agent (funnel register/monetisasi).
 */
export function UhuAskCtaLink({
  guestHref = "/agent",
  pageContextOverride,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  guestHref?: string;
  pageContextOverride?: string;
  children: ReactNode;
}) {
  const { isGuest, openUhu } = useUhu();
  return (
    <a
      href={guestHref}
      onClick={(e) => {
        onClick?.(e);
        if (!isGuest) {
          e.preventDefault();
          openUhu(pageContextOverride);
        }
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
