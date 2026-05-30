"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  ColorType,
} from "lightweight-charts";
import { formatPrice, formatVolume } from "@/lib/utils";

interface CandleData {
  date: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SwingPoint {
  type: "HIGH" | "LOW";
  price: number;
  date: string;
}

interface ComparePoint {
  date: string | number;
  value: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  chartType?: "candlestick" | "line" | "area";
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  sma200?: (number | null)[];
  ema12?: (number | null)[];
  ema26?: (number | null)[];
  showSma20?: boolean;
  showSma50?: boolean;
  showSma200?: boolean;
  showEma12?: boolean;
  showEma26?: boolean;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  swingPoints?: SwingPoint[];
  unconfirmedLeg?: SwingPoint | null;
  showZigzag?: boolean;
  compareData?: ComparePoint[];
  compareLabel?: string;
  isTimeVisible?: boolean;
}

interface ChartState {
  chart: IChartApi;
  candleSeries: ISeriesApi<"Candlestick">;
  lineSeries: ISeriesApi<"Line">;
  areaSeries: ISeriesApi<"Area">;
  volumeSeries: ISeriesApi<"Histogram">;
  sma20Series: ISeriesApi<"Line">;
  sma50Series: ISeriesApi<"Line">;
  sma200Series: ISeriesApi<"Line">;
  ema12Series: ISeriesApi<"Line">;
  ema26Series: ISeriesApi<"Line">;
  supportSeries: ISeriesApi<"Line">;
  resistanceSeries: ISeriesApi<"Line">;
  zigzagSeries: ISeriesApi<"Line">;
  zigzagUnconfirmedSeries: ISeriesApi<"Line">;
  compareSeries: ISeriesApi<"Line">;
}

interface TooltipData {
  x: number;
  y: number;
  date: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  compareValue?: number;
}

export function CandlestickChart({
  data,
  chartType = "candlestick",
  sma20,
  sma50,
  sma200,
  ema12,
  ema26,
  showSma20 = false,
  showSma50 = false,
  showSma200 = false,
  showEma12 = false,
  showEma26 = false,
  supportLevel,
  resistanceLevel,
  swingPoints,
  unconfirmedLeg,
  showZigzag = false,
  compareData,
  compareLabel,
  isTimeVisible = false,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ChartState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const dataMapRef = useRef<Map<string, CandleData>>(new Map());
  const compareMapRef = useRef<Map<string, number>>(new Map());

  const toKey = (d: string | number) => typeof d === "number" ? String(d) : d;

  // Keep data maps in sync
  useEffect(() => {
    const map = new Map<string, CandleData>();
    for (const d of data) {
      const key = toKey(d.date);
      map.set(key, d);
    }
    dataMapRef.current = map;
  }, [data]);

  useEffect(() => {
    const map = new Map<string, number>();
    if (compareData) {
      for (const d of compareData) {
        const key = toKey(d.date);
        map.set(key, d.value);
      }
    }
    compareMapRef.current = map;
  }, [compareData]);

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (!param.point || !param.time) {
      setTooltip(null);
      return;
    }

    const timeStr = String(param.time);
    const candle = dataMapRef.current.get(timeStr);
    if (!candle) {
      setTooltip(null);
      return;
    }

    const prevClose = data.length > 1 ? data[data.indexOf(candle) - 1]?.close ?? candle.open : candle.open;
    const change = ((candle.close - prevClose) / prevClose) * 100;

    setTooltip({
      x: param.point.x,
      y: param.point.y,
      date: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      change,
      compareValue: compareMapRef.current.get(timeStr),
    });
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#928b85",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.03)" },
        horzLines: { color: "rgba(0,0,0,0.03)" },
      },
      rightPriceScale: { borderColor: "rgba(0,0,0,0.06)" },
      timeScale: { borderColor: "rgba(0,0,0,0.06)", timeVisible: isTimeVisible, secondsVisible: false },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0d9488",
      downColor: "#dc2626",
      borderUpColor: "#0d9488",
      borderDownColor: "#dc2626",
      wickUpColor: "#0d9488",
      wickDownColor: "#dc2626",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const sma20Series = chart.addSeries(LineSeries, {
      color: "#d97706",
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const sma50Series = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const sma200Series = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema12Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema26Series = chart.addSeries(LineSeries, {
      color: "#ec4899",
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const supportSeries = chart.addSeries(LineSeries, {
      color: "rgba(13,148,136,0.35)",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const resistanceSeries = chart.addSeries(LineSeries, {
      color: "rgba(220,38,38,0.35)",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const zigzagSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });

    const zigzagUnconfirmedSeries = chart.addSeries(LineSeries, {
      color: "rgba(245,158,11,0.4)",
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      visible: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(37,99,235,0.25)",
      bottomColor: "rgba(37,99,235,0.02)",
      lineColor: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      visible: false,
    });

    const compareSeries = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: compareLabel ?? "",
      visible: false,
    });

    // Crosshair tooltip subscription
    chart.subscribeCrosshairMove(handleCrosshairMove);

    stateRef.current = {
      chart, candleSeries, lineSeries, areaSeries, volumeSeries,
      sma20Series, sma50Series, sma200Series, ema12Series, ema26Series,
      supportSeries, resistanceSeries, zigzagSeries, zigzagUnconfirmedSeries,
      compareSeries,
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      observer.disconnect();
      chart.remove();
      stateRef.current = null;
    };
  }, [isTimeVisible, handleCrosshairMove]);

  // Update data when it changes
  useEffect(() => {
    const s = stateRef.current;
    if (!s || data.length === 0) return;

    s.candleSeries.setData(
      data.map((d) => ({ time: d.date as import("lightweight-charts").Time, open: d.open, high: d.high, low: d.low, close: d.close }))
    );

    const closeData = data.map((d) => ({ time: d.date as import("lightweight-charts").Time, value: d.close }));
    s.lineSeries.setData(closeData);
    s.areaSeries.setData(closeData);

    s.volumeSeries.setData(
      data.map((d) => ({
        time: d.date as import("lightweight-charts").Time,
        value: d.volume,
        color: d.close >= d.open ? "rgba(13,148,136,0.35)" : "rgba(220,38,38,0.35)",
      }))
    );

    const toLineData = (values: (number | null)[] | undefined) =>
      values
        ? data.map((d, i) => ({ time: d.date as import("lightweight-charts").Time, value: values[i] })).filter((d): d is { time: import("lightweight-charts").Time; value: number } => d.value !== null && d.value !== undefined)
        : [];

    if (sma20) s.sma20Series.setData(toLineData(sma20));
    if (sma50) s.sma50Series.setData(toLineData(sma50));
    if (sma200) s.sma200Series.setData(toLineData(sma200));
    if (ema12) s.ema12Series.setData(toLineData(ema12));
    if (ema26) s.ema26Series.setData(toLineData(ema26));

    if (supportLevel != null && data.length > 0) {
      s.supportSeries.setData([
        { time: data[0].date as import("lightweight-charts").Time, value: supportLevel },
        { time: data[data.length - 1].date as import("lightweight-charts").Time, value: supportLevel },
      ]);
    } else {
      s.supportSeries.setData([]);
    }

    if (resistanceLevel != null && data.length > 0) {
      s.resistanceSeries.setData([
        { time: data[0].date as import("lightweight-charts").Time, value: resistanceLevel },
        { time: data[data.length - 1].date as import("lightweight-charts").Time, value: resistanceLevel },
      ]);
    } else {
      s.resistanceSeries.setData([]);
    }

    if (swingPoints && swingPoints.length > 0) {
      s.zigzagSeries.setData(
        swingPoints.map((sp) => ({ time: sp.date, value: sp.price }))
      );
    } else {
      s.zigzagSeries.setData([]);
    }

    if (swingPoints && swingPoints.length > 0 && unconfirmedLeg
        && unconfirmedLeg.date !== swingPoints[swingPoints.length - 1].date) {
      const last = swingPoints[swingPoints.length - 1];
      s.zigzagUnconfirmedSeries.setData([
        { time: last.date, value: last.price },
        { time: unconfirmedLeg.date, value: unconfirmedLeg.price },
      ]);
    } else {
      s.zigzagUnconfirmedSeries.setData([]);
    }

    s.chart.timeScale().fitContent();
  }, [data, sma20, sma50, sma200, ema12, ema26, supportLevel, resistanceLevel, swingPoints, unconfirmedLeg]);

  // Update compare data
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;

    if (compareData && compareData.length > 0) {
      // Normalize to percentage change from first point
      const baseValue = compareData[0].value;
      const normalized = compareData
        .filter((d) => d.value !== 0)
        .map((d) => ({ time: d.date, value: ((d.value - baseValue) / baseValue) * 100 }));

      // Also normalize main data to percentage for overlay
      if (data.length > 0) {
        const mainBase = data[0].close;
        const mainNormalized = data
          .map((d) => ({ time: d.date, value: ((d.close - mainBase) / mainBase) * 100 }));

        // Set percentage scale on a separate price scale
        s.compareSeries.applyOptions({
          visible: true,
          priceScaleId: "compare",
          title: compareLabel ?? "",
        });

        // Use percentage overlay: we need to overlay on the same scale
        // Simpler approach: just overlay the raw compare line on its own price scale
        s.compareSeries.applyOptions({
          visible: true,
          priceScaleId: "right",
        });
        s.compareSeries.setData(
          compareData.filter((d) => d.value !== 0).map((d) => ({ time: d.date as import("lightweight-charts").Time, value: d.value }))
        );
      }
    } else {
      s.compareSeries.setData([]);
      s.compareSeries.applyOptions({ visible: false });
    }
  }, [compareData, compareLabel, data]);

  // Toggle SMA visibility
  useEffect(() => {
    stateRef.current?.sma20Series.applyOptions({ visible: showSma20 });
  }, [showSma20]);

  useEffect(() => {
    stateRef.current?.sma50Series.applyOptions({ visible: showSma50 });
  }, [showSma50]);

  useEffect(() => {
    stateRef.current?.sma200Series.applyOptions({ visible: showSma200 });
  }, [showSma200]);

  useEffect(() => {
    stateRef.current?.ema12Series.applyOptions({ visible: showEma12 });
  }, [showEma12]);

  useEffect(() => {
    stateRef.current?.ema26Series.applyOptions({ visible: showEma26 });
  }, [showEma26]);

  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.zigzagSeries.applyOptions({ visible: showZigzag });
    s.zigzagUnconfirmedSeries.applyOptions({ visible: showZigzag });
  }, [showZigzag]);

  // Toggle chart type visibility
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.candleSeries.applyOptions({ visible: chartType === "candlestick" });
    s.lineSeries.applyOptions({ visible: chartType === "line" });
    s.areaSeries.applyOptions({ visible: chartType === "area" });
  }, [chartType]);

  const formatDate = (dateStr: string | number) => {
    const d = typeof dateStr === "number" ? new Date(dateStr * 1000) : new Date(dateStr);
    if (isTimeVisible) {
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-[320px] sm:h-[400px] lg:h-[450px]"
        role="img"
        aria-label="Stock price candlestick chart"
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-900/95 text-white rounded-lg px-3 py-2 text-[11px] font-mono leading-relaxed shadow-lg backdrop-blur-sm border border-gray-700/50"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 400) - 200),
            top: Math.max(tooltip.y - 80, 8),
          }}
        >
          <div className="text-gray-400 mb-1">{formatDate(tooltip.date)}</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <span className="text-gray-500">O</span>
            <span className="tabular-nums">{formatPrice(tooltip.open)}</span>
            <span className="text-gray-500">H</span>
            <span className="tabular-nums">{formatPrice(tooltip.high)}</span>
            <span className="text-gray-500">L</span>
            <span className="tabular-nums">{formatPrice(tooltip.low)}</span>
            <span className="text-gray-500">C</span>
            <span className={`tabular-nums ${tooltip.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPrice(tooltip.close)}
              <span className="ml-1 text-[10px]">
                ({tooltip.change >= 0 ? "+" : ""}{tooltip.change.toFixed(2)}%)
              </span>
            </span>
            <span className="text-gray-500">Vol</span>
            <span className="tabular-nums">{formatVolume(tooltip.volume)}</span>
          </div>
          {tooltip.compareValue != null && (
            <div className="mt-1 pt-1 border-t border-gray-700/50">
              <span className="text-indigo-400">{compareLabel}: {formatPrice(tooltip.compareValue)}</span>
            </div>
          )}
        </div>
      )}
      {/* Compare legend */}
      {compareData && compareData.length > 0 && compareLabel && (
        <div className="absolute top-2 left-3 flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-[11px]">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-500" />
          <span className="text-text-secondary font-medium">{compareLabel}</span>
        </div>
      )}
    </div>
  );
}
