import type { SVGProps } from "react";

export type UhuMood = "happy" | "thinking";

export interface UhuMascotProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number;
  mood?: UhuMood;
}

/**
 * UhuMascot — Maskot resmi TeknikalID (burung hantu minimal-geometric).
 * Pure presentational SVG (tanpa "use client", tanpa dependensi eksternal).
 * Menggunakan CSS variables design system (--color-accent, --color-bg-card, currentColor).
 */
export function UhuMascot({
  size = 44,
  mood = "happy",
  className,
  ...props
}: UhuMascotProps) {
  const isThinking = mood === "thinking";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
       xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Uhu — maskot TeknikalID"
      className={className}
      style={{ color: "var(--color-text-primary)" }}
      {...props}
    >
      {/* Alis / Ear-tuft segitiga kiri & kanan */}
      <polygon
        points="8,16 11,5 19,11"
        fill="var(--color-accent, var(--accent))"
      />
      <polygon
        points="36,16 33,5 25,11"
        fill="var(--color-accent, var(--accent))"
      />

      {/* Lingkaran kepala/badan utama */}
      <circle
        cx="22"
        cy="24"
        r="16"
        fill="var(--color-accent, var(--accent))"
      />

      {/* Aksen dada geometris lembut */}
      <path
        d="M15 33C17 36 27 36 29 33"
        stroke="var(--color-bg-card, var(--card))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* 2 Mata besar (warna bg) */}
      <circle
        cx="16"
        cy="22.5"
        r="5.5"
        fill="var(--color-bg-card, var(--card))"
      />
      <circle
        cx="28"
        cy="22.5"
        r="5.5"
        fill="var(--color-bg-card, var(--card))"
      />

      {isThinking ? (
        <>
          {/* Mood "thinking": mata setengah tertutup (kelopak atas turun + pupil melirik atas) */}
          <path
            d="M10.5 22.5 A5.5 5.5 0 0 1 21.5 22.5 Z"
            fill="var(--color-accent-bright, var(--color-accent))"
            opacity="0.85"
          />
          <path
            d="M22.5 22.5 A5.5 5.5 0 0 1 33.5 22.5 Z"
            fill="var(--color-accent-bright, var(--color-accent))"
            opacity="0.85"
          />
          <line
            x1="10.5"
            y1="22.5"
            x2="21.5"
            y2="22.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="22.5"
            y1="22.5"
            x2="33.5"
            y2="22.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="17" cy="24" r="2.1" fill="currentColor" />
          <circle cx="29" cy="24" r="2.1" fill="currentColor" />
          {/* Paruh kecil segitiga netral */}
          <polygon
            points="22,29.5 19.5,26 24.5,26"
            fill="var(--color-warning)"
          />
        </>
      ) : (
        <>
          {/* Mood "happy": mata bulat berbinar + paruh senyum */}
          <circle cx="16" cy="22.5" r="2.7" fill="currentColor" />
          <circle cx="28" cy="22.5" r="2.7" fill="currentColor" />
          <circle
            cx="17"
            cy="21.3"
            r="1"
            fill="var(--color-bg-card, var(--card))"
          />
          <circle
            cx="29"
            cy="21.3"
            r="1"
            fill="var(--color-bg-card, var(--card))"
          />
          {/* Paruh kecil segitiga + lengkung senyum */}
          <polygon
            points="22,29 19.2,25.5 24.8,25.5"
            fill="var(--color-warning)"
          />
          <path
            d="M19.2 29.8 Q22 31.8 24.8 29.8"
            stroke="var(--color-bg-card, var(--card))"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}
