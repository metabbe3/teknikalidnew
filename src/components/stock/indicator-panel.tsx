"use client";

import { useState } from "react";
import {
  translateRSI,
  translateMACD,
  translateStochastic,
  translateBB,
  translateADX,
  translateVWAP,
  translateATR,
  translateCrossSignal,
  translateOBV,
  translateSupertrend,
  translateSMA,
  translateEMA,
  type Translation,
} from "@/lib/indicator-translations";
import type { IndicatorValues } from "@/types/stock";
import { IndicatorTooltip } from "@/components/ui/indicator-tooltip";

interface IndicatorPanelProps {
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  close: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  vwap: number | null;
  atr: number | null;
  obv: number | null;
  obvTrend: string | null;
  supertrend: number | null;
  smaCrossSignal?: string | null;
  emaCrossSignal?: string | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  prevIndicator: IndicatorValues | null;
}

function IndicatorCard({ label, children, tip }: { label: string; children: React.ReactNode; tip?: string }) {
  return (
    <div className="indicator-card depth-shadow p-4 space-y-3">
      <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
        {label}
        {tip && <IndicatorTooltip indicator={tip} />}
      </h3>
      {children}
    </div>
  );
}

function ValueRow({ label, value, className, children }: { label: string; value: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span className={`text-[13px] font-mono tabular-nums font-medium flex items-center gap-1 ${className ?? ""}`}>
        {value}
        {children}
      </span>
    </div>
  );
}

function DeltaArrow({ current, prev, invert = false }: { current: number | null; prev: number | null; invert?: boolean }) {
  if (current === null || prev === null) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.001) return null;
  const isUp = diff > 0;
  const bullish = invert ? !isUp : isUp;
  return (
    <span className={`text-[10px] ${bullish ? "text-bullish" : "text-bearish"}`} aria-label={isUp ? "increased" : "decreased"}>
      {isUp ? "▲" : "▼"}
    </span>
  );
}

function SignalBadge({ variant, children }: { variant: "bullish" | "bearish" | "neutral"; children: React.ReactNode }) {
  const styles = {
    bullish: "bg-bullish-bg text-bullish",
    bearish: "bg-bearish-bg text-bearish",
    neutral: "bg-bg-hover text-text-secondary",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  );
}

function SentimentBadge({ sentiment, children }: { sentiment: Translation["sentiment"]; children: React.ReactNode }) {
  const styles = {
    positif: "bg-bullish-bg text-bullish",
    negatif: "bg-bearish-bg text-bearish",
    netral: "bg-bg-hover text-text-secondary",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[sentiment]}`}>
      {children}
    </span>
  );
}

function PlainText({ t }: { t: Translation }) {
  return (
    <div>
      <p className="text-sm font-semibold">{t.short}</p>
      {t.explanation && <p className="text-xs text-text-secondary mt-1">{t.explanation}</p>}
    </div>
  );
}

function AboveBelowBadge({ price, level }: { price: number | null; level: number | null }) {
  if (price === null || level === null) return null;
  const above = price > level;
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${above ? "bg-bullish-bg text-bullish" : "bg-bearish-bg text-bearish"}`}>
      {above ? "Above" : "Below"}
    </span>
  );
}

export function IndicatorPanel({
  rsi14, macdLine, macdSignal, macdHist, bbUpper, bbMiddle, bbLower,
  close, stochK, stochD, adx, vwap, atr, obv, obvTrend, supertrend,
  smaCrossSignal, emaCrossSignal,
  sma20, sma50, sma200, ema12, ema26, prevIndicator,
}: IndicatorPanelProps) {
  const [plainMode, setPlainMode] = useState(false);

  const prev = prevIndicator;
  const p = (key: keyof IndicatorValues) => prev?.[key] ?? null;

  const rsiSignal: "bullish" | "bearish" | "neutral" = rsi14 === null ? "neutral" : rsi14 > 70 ? "bearish" : rsi14 < 30 ? "bullish" : "neutral";
  const rsiColorClass = rsi14 === null ? "bg-bg-hover" : rsi14 > 70 ? "bg-bearish" : rsi14 < 30 ? "bg-bullish" : "bg-accent";
  const rsiWidth = rsi14 !== null ? Math.min(Math.max(rsi14, 0), 100) : 0;

  const bbPosition = (() => {
    if (close === null || bbUpper === null || bbLower === null || bbMiddle === null) return null;
    const range = bbUpper - bbLower;
    if (range === 0) return 50;
    return ((close - bbLower) / range) * 100;
  })();

  const macdHistMax = 100;
  const macdHistWidth = macdHist !== null ? Math.min(Math.abs(macdHist) / macdHistMax * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Indikator Teknikal</h3>
        <button
          onClick={() => setPlainMode(!plainMode)}
          className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
            plainMode
              ? "bg-accent/10 text-accent"
              : "bg-bg-hover text-text-secondary hover:text-text-primary"
          }`}
        >
          {plainMode ? "Lihat Angka" : "Bahasa Sederhana"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RSI */}
        <IndicatorCard label="RSI (14)" tip="RSI">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateRSI(rsi14).sentiment}>
                {translateRSI(rsi14).short}
              </SentimentBadge>
              <PlainText t={translateRSI(rsi14)} />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold tabular-nums">
                  {rsi14 !== null ? rsi14.toFixed(1) : "—"}
                  <DeltaArrow current={rsi14} prev={p("rsi14") as number | null} invert />
                </p>
                {rsi14 !== null && (
                  <SignalBadge variant={rsiSignal}>
                    {rsi14 > 70 ? "Overbought" : rsi14 < 30 ? "Oversold" : "Neutral"}
                  </SignalBadge>
                )}
              </div>
              <div
                className="w-full h-2 bg-bg-hover rounded-full overflow-hidden relative"
                role="progressbar"
                aria-valuenow={rsi14 ?? undefined}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="RSI 14 value"
              >
                <div className="absolute inset-y-0 left-0 w-[30%] bg-bullish/[0.06] rounded-l-full" aria-hidden="true" />
                <div className="absolute inset-y-0 right-0 w-[30%] bg-bearish/[0.06] rounded-r-full" aria-hidden="true" />
                <div
                  className={`absolute inset-y-0 rounded-full ${rsiColorClass} transition-all duration-500`}
                  style={{ width: `${rsiWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-text-tertiary font-medium">
                <span>30</span>
                <span>70</span>
              </div>
            </>
          )}
        </IndicatorCard>

        {/* MACD */}
        <IndicatorCard label="MACD" tip="MACD">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateMACD(macdHist).sentiment}>
                {translateMACD(macdHist).short}
              </SentimentBadge>
              <PlainText t={translateMACD(macdHist)} />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <ValueRow label="Line" value={macdLine !== null ? macdLine.toFixed(2) : "—"}>
                  <DeltaArrow current={macdLine} prev={p("macdLine") as number | null} />
                </ValueRow>
                <ValueRow label="Signal" value={macdSignal !== null ? macdSignal.toFixed(2) : "—"} />
                <ValueRow
                  label="Histogram"
                  value={macdHist !== null ? macdHist.toFixed(2) : "—"}
                  className={macdHist !== null ? (macdHist >= 0 ? "text-bullish" : "text-bearish") : ""}
                >
                  <DeltaArrow current={macdHist} prev={p("macdHist") as number | null} />
                </ValueRow>
              </div>
              {macdHist !== null && (
                <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden="true" />
                  <div
                    className={`absolute inset-y-0 rounded-full transition-all duration-300 ${macdHist >= 0 ? "bg-bullish left-1/2" : "bg-bearish right-1/2"}`}
                    style={{ width: `${macdHistWidth / 2}%` }}
                  />
                </div>
              )}
            </>
          )}
        </IndicatorCard>

        {/* Bollinger Bands */}
        <IndicatorCard label="Bollinger Bands" tip="Bollinger Bands">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateBB(bbPosition).sentiment}>
                {translateBB(bbPosition).short}
              </SentimentBadge>
              <PlainText t={translateBB(bbPosition)} />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <ValueRow label="Upper" value={bbUpper !== null ? bbUpper.toFixed(0) : "—"} />
                <ValueRow label="Middle" value={bbMiddle !== null ? bbMiddle.toFixed(0) : "—"} />
                <ValueRow label="Lower" value={bbLower !== null ? bbLower.toFixed(0) : "—"} />
              </div>
              {bbPosition !== null && (
                <div className="space-y-1.5">
                  <div
                    className="w-full h-2 bg-bg-hover rounded-full overflow-hidden relative"
                    role="meter"
                    aria-valuenow={bbPosition}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Price position within Bollinger Bands"
                  >
                    <div
                      className="absolute top-0 h-full w-2 bg-accent rounded-full transition-all duration-300"
                      style={{ left: `${Math.min(Math.max(bbPosition, 2), 92)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-tertiary text-center tabular-nums">
                    {bbPosition.toFixed(0)}% of band
                  </p>
                </div>
              )}
            </>
          )}
        </IndicatorCard>

        {/* Stochastic */}
        <IndicatorCard label="Stochastic" tip="Stochastic">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateStochastic(stochK, stochD).sentiment}>
                {translateStochastic(stochK, stochD).short}
              </SentimentBadge>
              <PlainText t={translateStochastic(stochK, stochD)} />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <ValueRow label="%K" value={stochK !== null ? stochK.toFixed(1) : "—"}>
                  <DeltaArrow current={stochK} prev={p("stochK") as number | null} invert />
                </ValueRow>
                <ValueRow label="%D" value={stochD !== null ? stochD.toFixed(1) : "—"} />
              </div>
              {stochK !== null && stochD !== null && (
                <SignalBadge
                  variant={stochK > 80 ? "bearish" : stochK < 20 ? "bullish" : stochK > stochD ? "bullish" : "bearish"}
                >
                  {stochK > 80 ? "Overbought" : stochK < 20 ? "Oversold" : stochK > stochD ? "Bullish Cross" : "Bearish Cross"}
                </SignalBadge>
              )}
            </>
          )}
        </IndicatorCard>

        {/* SMA */}
        <IndicatorCard label="SMA (20/50/200)" tip="SMA">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateSMA(sma20, sma50, sma200, close).sentiment}>
                {translateSMA(sma20, sma50, sma200, close).short}
              </SentimentBadge>
              <PlainText t={translateSMA(sma20, sma50, sma200, close)} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] text-text-secondary">SMA 20</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-mono tabular-nums font-medium">
                    {sma20 !== null ? sma20.toFixed(0) : "—"}
                  </span>
                  <DeltaArrow current={sma20} prev={p("sma20") as number | null} />
                  <AboveBelowBadge price={close} level={sma20} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] text-text-secondary">SMA 50</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-mono tabular-nums font-medium">
                    {sma50 !== null ? sma50.toFixed(0) : "—"}
                  </span>
                  <DeltaArrow current={sma50} prev={p("sma50") as number | null} />
                  <AboveBelowBadge price={close} level={sma50} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] text-text-secondary">SMA 200</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-mono tabular-nums font-medium">
                    {sma200 !== null ? sma200.toFixed(0) : "—"}
                  </span>
                  <DeltaArrow current={sma200} prev={p("sma200") as number | null} />
                  <AboveBelowBadge price={close} level={sma200} />
                </span>
              </div>
            </div>
          )}
        </IndicatorCard>

        {/* EMA */}
        <IndicatorCard label="EMA (12/26)" tip="EMA">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateEMA(ema12, ema26, close).sentiment}>
                {translateEMA(ema12, ema26, close).short}
              </SentimentBadge>
              <PlainText t={translateEMA(ema12, ema26, close)} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] text-text-secondary">EMA 12</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-mono tabular-nums font-medium">
                    {ema12 !== null ? ema12.toFixed(0) : "—"}
                  </span>
                  <DeltaArrow current={ema12} prev={p("ema12") as number | null} />
                  <AboveBelowBadge price={close} level={ema12} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] text-text-secondary">EMA 26</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-mono tabular-nums font-medium">
                    {ema26 !== null ? ema26.toFixed(0) : "—"}
                  </span>
                  <DeltaArrow current={ema26} prev={p("ema26") as number | null} />
                  <AboveBelowBadge price={close} level={ema26} />
                </span>
              </div>
              {ema12 !== null && ema26 !== null && (
                <div className="pt-1">
                  <SignalBadge variant={ema12 > ema26 ? "bullish" : "bearish"}>
                    {ema12 > ema26 ? "Bullish Cross" : "Bearish Cross"}
                  </SignalBadge>
                </div>
              )}
            </div>
          )}
        </IndicatorCard>

        {/* OBV */}
        <IndicatorCard label="OBV" tip="OBV">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateOBV(obvTrend).sentiment}>
                {translateOBV(obvTrend).short}
              </SentimentBadge>
              <PlainText t={translateOBV(obvTrend)} />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold tabular-nums">
                  {obv !== null ? (obv / 1e6).toFixed(1) + "M" : "—"}
                  <DeltaArrow current={obv} prev={p("obv") as number | null} />
                </p>
                {obvTrend !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    obvTrend === "Accumulation" ? "bg-bullish-bg text-bullish" : "bg-bearish-bg text-bearish"
                  }`}>
                    {obvTrend === "Accumulation" ? "Accumulation" : "Distribution"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-tertiary">On-Balance Volume</p>
            </>
          )}
        </IndicatorCard>

        {/* Supertrend */}
        <IndicatorCard label="Supertrend" tip="Supertrend">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateSupertrend(close, supertrend).sentiment}>
                {translateSupertrend(close, supertrend).short}
              </SentimentBadge>
              <PlainText t={translateSupertrend(close, supertrend)} />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold tabular-nums">
                  {supertrend !== null ? supertrend.toFixed(0) : "—"}
                  <DeltaArrow current={supertrend} prev={p("supertrend") as number | null} />
                </p>
                {supertrend !== null && close !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    close > supertrend ? "bg-bullish-bg text-bullish" : "bg-bearish-bg text-bearish"
                  }`}>
                    {close > supertrend ? "Bullish" : "Bearish"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-tertiary">10 &middot; 3x ATR</p>
            </>
          )}
        </IndicatorCard>

        {/* ADX */}
        <IndicatorCard label="ADX (14)" tip="ADX">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateADX(adx).sentiment}>
                {translateADX(adx).short}
              </SentimentBadge>
              <PlainText t={translateADX(adx)} />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold tabular-nums">
                  {adx !== null ? adx.toFixed(1) : "—"}
                  <DeltaArrow current={adx} prev={p("adx") as number | null} />
                </p>
                {adx !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    adx > 50 ? "bg-accent/10 text-accent" : adx > 25 ? "bg-bullish-bg text-bullish" : "bg-bg-hover text-text-tertiary"
                  }`}>
                    {adx > 50 ? "Very Strong" : adx > 25 ? "Trending" : "Weak"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-tertiary">Average Directional Index</p>
            </>
          )}
        </IndicatorCard>

        {/* VWAP */}
        <IndicatorCard label="VWAP" tip="VWAP">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateVWAP(close, vwap).sentiment}>
                {translateVWAP(close, vwap).short}
              </SentimentBadge>
              <PlainText t={translateVWAP(close, vwap)} />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold tabular-nums">{vwap !== null ? vwap.toFixed(0) : "—"}</p>
                {vwap !== null && close !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    close > vwap ? "bg-bullish-bg text-bullish" : "bg-bearish-bg text-bearish"
                  }`}>
                    {close > vwap ? "Above" : "Below"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-tertiary">Volume Weighted Avg Price</p>
            </>
          )}
        </IndicatorCard>

        {/* ATR */}
        <IndicatorCard label="ATR (14)" tip="ATR">
          {plainMode ? (
            <div className="space-y-2">
              <SentimentBadge sentiment={translateATR(atr, close).sentiment}>
                {translateATR(atr, close).short}
              </SentimentBadge>
              <PlainText t={translateATR(atr, close)} />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold tabular-nums">
                  {atr !== null ? atr.toFixed(0) : "—"}
                  <DeltaArrow current={atr} prev={p("atr") as number | null} />
                </p>
              </div>
              <p className="text-[10px] text-text-tertiary">
                Average True Range
                {atr !== null && close !== null && close > 0 ? ` · ${(atr / close * 100).toFixed(1)}%` : ""}
              </p>
            </>
          )}
        </IndicatorCard>
      </div>

      {/* Cross Signals */}
      {(smaCrossSignal || emaCrossSignal) && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {smaCrossSignal && (
            plainMode ? (
              <div className="flex items-center gap-1.5">
                <SentimentBadge sentiment={translateCrossSignal(smaCrossSignal, "sma").sentiment}>
                  {translateCrossSignal(smaCrossSignal, "sma").short}
                </SentimentBadge>
                <span className="text-[11px] text-text-secondary">{translateCrossSignal(smaCrossSignal, "sma").explanation}</span>
              </div>
            ) : null
          )}
          {emaCrossSignal && (
            plainMode ? (
              <div className="flex items-center gap-1.5">
                <SentimentBadge sentiment={translateCrossSignal(emaCrossSignal, "ema").sentiment}>
                  {translateCrossSignal(emaCrossSignal, "ema").short}
                </SentimentBadge>
                <span className="text-[11px] text-text-secondary">{translateCrossSignal(emaCrossSignal, "ema").explanation}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
