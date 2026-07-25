"use client";

import { useId } from "react";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Stretch to container width (uses viewBox + non-scaling stroke). */
  responsive?: boolean;
}

export function MiniSparkline({ data, width = 80, height = 40, color, responsive = false }: MiniSparklineProps) {
  const gradientId = "sg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const autoColor = color ?? (data[data.length - 1] >= data[0] ? "#0d9488" : "#dc2626");

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={responsive ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={responsive ? "none" : "xMidYMid meet"}
      fill="none"
      aria-hidden="true"
      style={responsive ? { width: "100%" } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={autoColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={autoColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${height - pad} ${points} ${width - pad},${height - pad}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        stroke={autoColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect={responsive ? "non-scaling-stroke" : undefined}
      />
      {!responsive && (
        <circle
          cx={width - pad}
          cy={pad + (1 - (data[data.length - 1] - min) / range) * (height - pad * 2)}
          r="2.5"
          fill={autoColor}
        />
      )}
    </svg>
  );
}
