"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type LineData,
} from "lightweight-charts";

interface RsiPanelProps {
  data: { date: string | number; value: number | null }[];
  isTimeVisible: boolean;
  onVisibleTimeRangeChange?: (from: number, to: number) => void;
  parentVisibleRange?: { from: number; to: number } | null;
}

export default function RsiPanel({
  data,
  isTimeVisible,
  onVisibleTimeRangeChange,
  parentVisibleRange,
}: RsiPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const overboughtSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const oversoldSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#928b85",
        fontSize: 11,
      },
      grid: {
        vertLines: {
          color: "rgba(0, 0, 0, 0.03)",
        },
        horzLines: {
          color: "rgba(0, 0, 0, 0.03)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(0, 0, 0, 0.06)",
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
      },
      timeScale: {
        borderColor: "rgba(0, 0, 0, 0.06)",
        timeVisible: isTimeVisible,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
    });

    chartRef.current = chart;

    // RSI line series
    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
    });
    rsiSeriesRef.current = rsiSeries;

    // Overbought reference line at 70
    const overboughtSeries = chart.addSeries(LineSeries, {
      color: "rgba(220, 38, 38, 0.3)",
      lineStyle: 2, // dashed
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    overboughtSeriesRef.current = overboughtSeries;

    // Oversold reference line at 30
    const oversoldSeries = chart.addSeries(LineSeries, {
      color: "rgba(13, 148, 136, 0.3)",
      lineStyle: 2, // dashed
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    oversoldSeriesRef.current = oversoldSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      rsiSeriesRef.current = null;
      overboughtSeriesRef.current = null;
      oversoldSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when data prop changes
  useEffect(() => {
    if (!rsiSeriesRef.current || !overboughtSeriesRef.current || !oversoldSeriesRef.current) return;

    // Filter out null values for RSI series
    const rsiData = data
      .filter((item) => item.value !== null)
      .map((item) => ({
        time: item.date as Time,
        value: item.value as number,
      }));

    // Create reference line data spanning from first to last date
    const referenceLineData: LineData[] = [];
    if (data.length > 0) {
      const firstDate = data[0].date as Time;
      const lastDate = data[data.length - 1].date as Time;
      referenceLineData.push(
        { time: firstDate, value: 70 },
        { time: lastDate, value: 70 }
      );
    }

    const oversoldLineData: LineData[] = [];
    if (data.length > 0) {
      const firstDate = data[0].date as Time;
      const lastDate = data[data.length - 1].date as Time;
      oversoldLineData.push(
        { time: firstDate, value: 30 },
        { time: lastDate, value: 30 }
      );
    }

    rsiSeriesRef.current.setData(rsiData);
    overboughtSeriesRef.current.setData(referenceLineData);
    oversoldSeriesRef.current.setData(oversoldLineData);
  }, [data]);

  // Sync with parent chart - subscribe to visibleTimeRangeChange
  useEffect(() => {
    if (!chartRef.current) return;

    const handleTimeRangeChange = () => {
      const timeScale = chartRef.current!.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      if (visibleRange && onVisibleTimeRangeChange) {
        onVisibleTimeRangeChange(
          visibleRange.from as number,
          visibleRange.to as number
        );
      }
    };

    chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);

    return () => {
      chartRef.current?.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
    };
  }, [onVisibleTimeRangeChange]);

  // Sync with parent chart - apply parent's visible range
  useEffect(() => {
    if (!chartRef.current || !parentVisibleRange) return;

    const timeScale = chartRef.current.timeScale();
    timeScale.setVisibleRange({
      from: parentVisibleRange.from as Time,
      to: parentVisibleRange.to as Time,
    });
  }, [parentVisibleRange]);

  // Update timeVisible option
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: isTimeVisible,
      },
    });
  }, [isTimeVisible]);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        if (chartRef.current) {
          chartRef.current.applyOptions({ width, height });
        }
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-[120px]">
      <div className="absolute top-2 left-2 text-xs text-text-tertiary font-medium z-10">
        RSI (14)
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}