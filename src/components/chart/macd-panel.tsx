"use client";

import { useEffect, useRef } from "react";
import { createChart, LineSeries, HistogramSeries, ColorType, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";

interface MacdPanelProps {
  dates: (string | number)[];
  macdLine: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
  isTimeVisible: boolean;
  onVisibleTimeRangeChange?: (from: number, to: number) => void;
  parentVisibleRange?: { from: number; to: number } | null;
}

export default function MacdPanel({
  dates,
  macdLine,
  signal,
  histogram,
  isTimeVisible,
  onVisibleTimeRangeChange,
  parentVisibleRange,
}: MacdPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#928b85",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.03)" },
        horzLines: { color: "rgba(0,0,0,0.03)" },
      },
      rightPriceScale: {
        borderColor: "rgba(0,0,0,0.06)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(0,0,0,0.06)",
        timeVisible: isTimeVisible,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
    });

    chartRef.current = chart;

    // MACD line series
    const macdSeries = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdSeriesRef.current = macdSeries;

    // Signal line series
    const signalSeries = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    signalSeriesRef.current = signalSeries;

    // Histogram series
    const histogramSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "price", precision: 2 },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    histogramSeriesRef.current = histogramSeries;

    // Subscribe to visible time range changes
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (range && onVisibleTimeRangeChange) {
        const from = range.from as unknown as number;
        const to = range.to as unknown as number;
        onVisibleTimeRangeChange(from, to);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth,
        height: chartContainerRef.current?.clientHeight,
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update chart when parentVisibleRange changes
  useEffect(() => {
    if (chartRef.current && parentVisibleRange) {
      chartRef.current.timeScale().setVisibleRange({
        from: parentVisibleRange.from as Time,
        to: parentVisibleRange.to as Time,
      });
    }
  }, [parentVisibleRange]);

  // Update series data when props change
  useEffect(() => {
    if (!macdSeriesRef.current || !signalSeriesRef.current || !histogramSeriesRef.current) return;

    // Filter nulls and build data arrays
    const macdData: { time: Time; value: number }[] = [];
    const signalData: { time: Time; value: number }[] = [];
    const histogramData: { time: Time; value: number; color: string }[] = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const macdValue = macdLine[i];
      const signalValue = signal[i];
      const histogramValue = histogram[i];

      const time = date as Time;

      if (macdValue !== null) {
        macdData.push({ time, value: macdValue });
      }

      if (signalValue !== null) {
        signalData.push({ time, value: signalValue });
      }

      if (histogramValue !== null) {
        const color = histogramValue >= 0
          ? "rgba(13,148,136,0.6)"
          : "rgba(220,38,38,0.6)";
        histogramData.push({ time, value: histogramValue, color });
      }
    }

    macdSeriesRef.current.setData(macdData);
    signalSeriesRef.current.setData(signalData);
    histogramSeriesRef.current.setData(histogramData);
  }, [dates, macdLine, signal, histogram]);

  // Update time visibility
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        timeScale: {
          timeVisible: isTimeVisible,
          secondsVisible: false,
        },
      });
    }
  }, [isTimeVisible]);

  return (
    <div className="relative w-full h-[120px]">
      <div ref={chartContainerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-xs text-text-tertiary font-medium">
        MACD (12,26,9)
      </div>
    </div>
  );
}