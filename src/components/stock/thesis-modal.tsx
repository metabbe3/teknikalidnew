"use client";

import { useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTheses, useUpsertThesis, useDeleteThesis, type ThesisBias } from "@/hooks/use-thesis";

const BIASES: { value: ThesisBias; label: string; active: string }[] = [
  { value: "BULLISH", label: "Bullish", active: "bg-bullish text-white border-bullish" },
  { value: "BEARISH", label: "Bearish", active: "bg-bearish text-white border-bearish" },
  { value: "NEUTRAL", label: "Netral", active: "bg-text-secondary text-white border-text-secondary" },
];

function ThesisForm({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const { data: theses } = useTheses();
  const existing = theses?.find((t) => t.ticker === ticker);

  const [bias, setBias] = useState<ThesisBias>(existing?.bias ?? "BULLISH");
  const [target, setTarget] = useState(existing?.targetPrice?.toString() ?? "");
  const [stop, setStop] = useState(existing?.stopLoss?.toString() ?? "");
  const [rationale, setRationale] = useState(existing?.rationale ?? "");
  const [err, setErr] = useState<string | null>(null);

  const upsert = useUpsertThesis();
  const remove = useDeleteThesis();

  async function save() {
    setErr(null);
    try {
      await upsert.mutateAsync({
        ticker,
        bias,
        targetPrice: target ? Number(target) : null,
        stopLoss: stop ? Number(stop) : null,
        rationale: rationale.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Kunci tesis {ticker.replace(/\.JK$/i, "")}</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1" aria-label="Tutup">
            ✕
          </button>
        </div>

        <label className="block text-xs font-medium text-text-secondary mb-1.5">Pandangan</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {BIASES.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setBias(b.value)}
              className={`text-sm font-medium py-2 rounded-lg border transition-colors ${
                bias === b.value ? b.active : "border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Target</label>
            <input
              type="number"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="—"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono tabular-nums focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Stop loss</label>
            <input
              type="number"
              inputMode="numeric"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
              placeholder="—"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono tabular-nums focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <label className="block text-xs font-medium text-text-secondary mb-1.5">Alasan (opsional)</label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="Kenapa Anda yakin?"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
        />

        {err && <p className="text-xs text-bearish mt-2">{err}</p>}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={save}
            disabled={upsert.isPending}
            className="flex-1 bg-text-primary text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-text-primary/90 disabled:opacity-50 transition-colors"
          >
            {upsert.isPending ? "Menyimpan…" : existing ? "Perbarui tesis" : "Kunci tesis"}
          </button>
          {existing && (
            <button
              onClick={async () => {
                await remove.mutateAsync(ticker);
                onClose();
              }}
              className="text-sm text-bearish hover:underline px-2"
            >
              Hapus
            </button>
          )}
        </div>
        <p className="text-[11px] text-text-tertiary mt-3 text-center">
          Anda akan melihat tesis ini di beranda saat harga/sinyal menguji level ini.
        </p>
      </div>
    </div>
  );
}

export function ThesisButton({ ticker }: { ticker: string }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  if (status !== "authenticated") {
    return (
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 min-h-11 sm:min-h-0 text-xs font-medium border border-border text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-all press-scale"
      >
        🎯 Kunci tesis
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 min-h-11 sm:min-h-0 text-xs font-medium border border-border text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-all press-scale"
      >
        🎯 Kunci tesis
      </button>
      {open && mounted && createPortal(<ThesisForm ticker={ticker} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
