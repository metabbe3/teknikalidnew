"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { stripJk } from "@/lib/utils";

export function RemoveWatchlistButton({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleRemove() {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE ${ticker} failed: ${res.status}`);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        data-action="remove-watchlist"
        data-ticker={ticker}
        onClick={handleRemove}
        disabled={pending}
        className="text-xs text-text-secondary hover:text-bearish transition-colors press-scale"
        aria-label={`Hapus ${stripJk(ticker)} dari daftar pantauan`}
      >
        {pending ? "Menghapus…" : "Hapus"}
      </button>
      {failed && (
        <span className="text-xs text-bearish">Gagal hapus, coba lagi</span>
      )}
    </div>
  );
}
