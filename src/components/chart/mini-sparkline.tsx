interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function MiniSparkline({ data, width = 80, height = 40, color }: MiniSparklineProps) {
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

  const gradientId = `sg-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
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
      />
      <circle
        cx={width - pad}
        cy={pad + (1 - (data[data.length - 1] - min) / range) * (height - pad * 2)}
        r="2.5"
        fill={autoColor}
      />
    </svg>
  );
}
