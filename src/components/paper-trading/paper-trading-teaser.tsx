"use client";

import Link from "next/link";
import { stripJk } from "@/lib/utils";

interface PaperTradingTeaserProps {
  ticker: string;
  entryPrice?: number | null;
  tp?: number | null;
  sl?: number | null;
}

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function PaperTradingTeaser({
  ticker,
  entryPrice,
  tp,
  sl,
}: PaperTradingTeaserProps) {
  const t = stripJk(ticker);

  return (
    <div className="mt-3 relative rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10 px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5eead4"
            strokeWidth="2"
            className="shrink-0"
          >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span className="text-sm font-semibold text-slate-200">
            Simulasi Trading {t}
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Latih strategi tanpa risiko. Mulai dengan Rp 10.000.000 virtual.
        </p>

        {(entryPrice || tp || sl) && (
          <div className="flex items-center gap-4 text-[11px] mb-3">
            {entryPrice && (
              <div>
                <span className="text-slate-500">Entry</span>{" "}
                <span className="font-semibold text-slate-300 font-mono tabular-nums">
                  {formatRp(entryPrice)}
                </span>
              </div>
            )}
            {tp && (
              <div>
                <span className="text-slate-500">TP</span>{" "}
                <span className="font-semibold text-emerald-400 font-mono tabular-nums">
                  {formatRp(tp)}
                </span>
              </div>
            )}
            {sl && (
              <div>
                <span className="text-slate-500">SL</span>{" "}
                <span className="font-semibold text-red-400 font-mono tabular-nums">
                  {formatRp(sl)}
                </span>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/auth/signin?callbackUrl=${encodeURIComponent(`/paper-trading?ticker=${ticker}`)}`}
          className="press-scale inline-flex items-center gap-1.5 text-xs font-bold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
        >
          Daftar & Mulai Simulasi Gratis
        </Link>
      </div>
    </div>
  );
}
