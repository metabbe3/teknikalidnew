"use client";

import { formatPrice, formatTanggalIndo, normalizeTicker } from "@/lib/utils";

export type OhlcvData = {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  prevClose: number | null;
  volume: number;
  volumeRatio: number;
  date?: Date | string | null;
  sessionDate?: string;
};

const compactVolFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactVol(volume: number): string {
  if (!Number.isFinite(volume) || volume <= 0) return "0";
  return compactVolFormatter.format(volume);
}

export function OhlcvLive({
  ohlcv,
  ticker,
  sessionDate,
}: {
  ohlcv?: OhlcvData | null;
  ticker?: string;
  sessionDate?: string;
}) {
  if (!ohlcv || (ohlcv.open ?? ohlcv.high ?? ohlcv.low) === null) {
    return null;
  }

  const liveTicker = ticker
    ? ticker.startsWith("^")
      ? ticker.toUpperCase()
      : normalizeTicker(ticker)
    : undefined;

  const resolvedSessionDate =
    sessionDate ?? ohlcv.sessionDate ?? formatTanggalIndo(ohlcv.date);

  return (
    <div
      className="flex items-center justify-between gap-2 flex-wrap rounded-lg bg-bg-hover/60 px-2.5 py-1.5 text-[10px] leading-none text-text-tertiary"
      aria-label="Ringkasan OHLCV sesi terbaru"
      title={
        resolvedSessionDate
          ? `Ringkasan OHLCV sesi ${resolvedSessionDate}`
          : "Ringkasan OHLCV sesi terbaru"
      }
    >
      <span className="flex items-center gap-1">
        <span aria-hidden="true">O</span>
        <span
          data-live-oh={liveTicker}
          className="font-mono font-semibold tabular-nums text-text-secondary"
        >
          {formatPrice(ohlcv.open ?? 0)}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span aria-hidden="true">H</span>
        <span
          data-live-high={liveTicker}
          className="font-mono font-semibold tabular-nums text-bullish"
        >
          {formatPrice(ohlcv.high ?? 0)}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span aria-hidden="true">L</span>
        <span
          data-live-low={liveTicker}
          className="font-mono font-semibold tabular-nums text-bearish"
        >
          {formatPrice(ohlcv.low ?? 0)}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span aria-hidden="true">C</span>
        <span
          data-live-close={liveTicker}
          className="font-mono font-semibold tabular-nums text-text-secondary"
        >
          {formatPrice(ohlcv.close ?? 0)}
        </span>
      </span>
      {ohlcv.volume > 0 && (
        <span className="flex items-center gap-1">
          <span aria-hidden="true">Vol</span>
          <span className="font-mono font-semibold tabular-nums text-text-secondary">
            <span data-live-vol={liveTicker}>{formatCompactVol(ohlcv.volume)}</span>
            {ohlcv.volumeRatio >= 1.5 ? (
              <span className="text-accent font-bold">
                {" "}
                x{ohlcv.volumeRatio.toFixed(1).replace(".", ",")}
              </span>
            ) : null}
          </span>
        </span>
      )}
      {resolvedSessionDate && (
        <span
          className="text-[10px] text-text-tertiary"
          data-live-session={liveTicker ?? ""}
          data-session-eod={resolvedSessionDate}
        >
          sesi {resolvedSessionDate}
        </span>
      )}
    </div>
  );
}
