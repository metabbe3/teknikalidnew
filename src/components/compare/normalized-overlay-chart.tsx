"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, LineSeries, type IChartApi, type MouseEventParams, ColorType } from "lightweight-charts";
import { stripJk } from "@/lib/utils";

interface ChartSeries {
  ticker: string;
  color: string;
  data: { time: string; value: number }[];
}

interface NormalizedOverlayChartProps {
  series: ChartSeries[];
}

interface TooltipData {
  x: number;
  time: string;
  values: { ticker: string; color: string; value: number | null }[];
}

export function NormalizedOverlayChart({ series }: NormalizedOverlayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (!param.time || !param.point) {
      setTooltip(null);
      return;
    }

    const timeStr = param.time as string;
    const values = series.map((s) => {
      const point = s.data.find((d) => d.time === timeStr);
      return { ticker: s.ticker, color: s.color, value: point?.value ?? null };
    });

    setTooltip({ x: param.point.x, time: timeStr, values });
  }, [series]);

  useEffect(() => {
    if (!containerRef.current || series.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#928b85",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.03)" },
        horzLines: { color: "rgba(0,0,0,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(0,0,0,0.06)",
        scaleMargins: { top: 0.05, bottom: 0.05 },
        ticksVisible: false,
      },
      timeScale: {
        borderColor: "rgba(0,0,0,0.06)",
        timeVisible: false,
        ticksVisible: false,
      },
      crosshair: {
        horzLine: { labelBackgroundColor: "#333", labelVisible: false, style: 2, width: 1 },
        vertLine: { labelBackgroundColor: "#1c1917", width: 1, style: 0, color: "rgba(0,0,0,0.15)" },
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;
    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Zero reference line
    const zeroSeries = chart.addSeries(LineSeries, {
      color: "rgba(0,0,0,0.12)",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    if (series[0]?.data.length) {
      zeroSeries.setData(series[0].data.map((d) => ({ time: d.time, value: 0 })));
    }

    // Lines for each stock
    for (const s of series) {
      if (s.data.length === 0) continue;

      chart.addSeries(LineSeries, {
        color: s.color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#fff",
        crosshairMarkerBorderWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        priceFormat: { type: "percent", precision: 1 },
      }).setData(s.data as { time: string; value: number }[]);
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [series, handleCrosshairMove]);

  const containerWidth = containerRef.current?.clientWidth ?? 600;
  const tooltipOnLeft = tooltip && tooltip.x > containerWidth - 200;

  return (
    <div className="depth-shadow-strong rounded-xl overflow-hidden bg-bg-card relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" aria-hidden="true" />
      <div ref={containerRef} className="w-full h-[320px] sm:h-[440px]" />

      {/* Crosshair-following tooltip */}
      {tooltip && tooltip.values.some((v) => v.value !== null) && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-bg-surface/95 backdrop-blur-sm depth-shadow rounded-lg border border-border/50 px-3 py-2.5 pointer-events-none z-10 min-w-[150px]"
          style={{
            left: tooltipOnLeft ? tooltip.x - 170 : tooltip.x + 16,
            transition: "left 80ms ease-out",
          }}
        >
          {/* Small caret */}
          {!tooltipOnLeft && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full" aria-hidden="true">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-border/50" />
            </div>
          )}
          <p className="text-[10px] text-text-tertiary mb-2 font-medium tracking-wide">{tooltip.time}</p>
          <div className="space-y-1">
            {tooltip.values.map((v) => (
              <div key={v.ticker} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                  <span className="text-[11px] text-text-secondary font-medium">{stripJk(v.ticker)}</span>
                </div>
                {v.value !== null && (
                  <span className={`text-[11px] font-mono tabular-nums font-bold ${v.value >= 0 ? "text-bullish" : "text-bearish"}`}>
                    {v.value >= 0 ? "+" : ""}{v.value.toFixed(2)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
