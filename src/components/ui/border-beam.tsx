"use client";

import { CSSProperties, ReactNode, useMemo } from "react";

/**
 * BorderBeam teknikal.id — port ringan efek border-beam (libraries.dev, MIT)
 * untuk modal AI. Paket npm aslinya bikin `next build --webpack` (Next 16.3.8)
 * crash "undefined length" di Mac mini ini, jadi efek dipindahkan ke CSS murni:
 * conic-gradient beam berputar di border, hanya saat `active` (loading AI).
 * Zero-dependency, ~60 baris, prefers-reduced-motion aman (animasi cuma opacity/rotate ringan).
 */

interface BorderBeamProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
  colorFrom?: string;
  colorTo?: string;
  size?: number; // ketebalan beam (px)
  duration?: number; // detik per putaran
}

export function BorderBeam({
  children,
  active = true,
  className = "",
  colorFrom = "#38bdf8",
  colorTo = "#818cf8",
  size = 2,
  duration = 6,
}: BorderBeamProps) {
  const style = useMemo<CSSProperties>(
    () => ({
      "--beam-from": colorFrom,
      "--beam-to": colorTo,
      "--beam-size": `${size}px`,
      "--beam-duration": `${duration}s`,
      opacity: active ? 1 : 0,
      transition: "opacity 400ms ease",
    }),
    [active, colorFrom, colorTo, size, duration]
  );

  return (
    <div className={`beam-wrap ${className}`} style={style}>
      {children}
      <span className="beam-ring" aria-hidden="true" />
    </div>
  );
}
