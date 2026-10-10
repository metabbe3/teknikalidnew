"use client";

/**
 * ScreenActions — Copy Link Hasil Screener + Simpan preset ini (guest, localStorage).
 * Retention Loop v1 — PRD idea-2026-10-09-1, AC1 + AC2.
 * SSR-safe: semua state render hanya setelah mounted (useEffect), 0 hydration mismatch.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSavedScreens } from "@/hooks/use-saved-screens";

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

export function ScreenActions({ currentUrl, shareQuery, saveLabel }: { currentUrl: string; shareQuery: string; saveLabel: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isGuest = !session?.user;
  const { save, screens } = useSavedScreens();

  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}/stocks?${shareQuery}` : `/stocks?${shareQuery}`;

  // currentUrl dipakai next-param register; shareQuery = query param screener utk disimpan/dibagikan
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!mounted || !isGuest) return;
    const qs = shareQuery.startsWith("?") ? shareQuery.slice(1) : shareQuery;
    setJustSaved(screens.some((s) => s.queryString === qs));
  }, [mounted, isGuest, shareQuery, screens]);

  const handleCopy = async () => {
    const url = `${window.location.origin}/stocks?${shareQuery}`;
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // Clipboard API bisa gagal di HTTP/non-secure context — fallback DOM copy
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        ta.remove();
      } catch {
        copied = false;
      }
    }
    setToast(copied ? "Link hasil screener dikopi — tempel di WA/IG" : "Gagal menyalin link");
  };

  const handleSave = () => {
    const qs = shareQuery.startsWith("?") ? shareQuery.slice(1) : shareQuery;
    const result = save({ key: saveLabel, label: saveLabel, queryString: qs });
    setToast(result ? "Preset tersimpan di perangkat ini" : "Gagal menyimpan preset");
  };

  if (!mounted) return null;

  const qs = shareQuery.startsWith("?") ? shareQuery.slice(1) : shareQuery;
  const isSaved = isGuest && screens.some((s) => s.queryString === qs);

  return (
    <div className="flex items-center gap-2">
      {toast && (
        <span role="status" aria-live="polite" className="text-[11px] text-accent font-medium whitespace-nowrap">
          {toast}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 text-xs font-medium rounded-lg border border-border bg-bg-card hover:bg-bg-hover transition-colors cursor-pointer"
        aria-label="Copy link hasil screener"
        title={fullUrl}
      >
        <LinkIcon />
        Copy Link
      </button>
      {isGuest ? (
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-2.5 min-h-11 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            isSaved || justSaved
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border bg-bg-card hover:bg-bg-hover"
          }`}
          aria-label={isSaved ? "Preset sudah tersimpan" : "Simpan preset ini di perangkat"}
          aria-pressed={isSaved || justSaved}
        >
          <StarIcon filled={isSaved || justSaved} />
          {isSaved || justSaved ? "Tersimpan" : "Simpan preset ini"}
        </button>
      ) : (
        <button
          onClick={() => {
            try {
              sessionStorage.setItem("pending_post_register", JSON.stringify({ type: "save_screen", filters: { preset: qs }, next: currentUrl }));
            } catch {
              // ignore storage errors
            }
            router.push("/auth/register?utm_source=stocks_screener&utm_medium=save_screen_button");
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 text-xs font-medium rounded-lg border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          aria-label="Simpan screen ke akun"
        >
          <StarIcon filled={false} />
          Simpan ke Akun
        </button>
      )}
    </div>
  );
}
