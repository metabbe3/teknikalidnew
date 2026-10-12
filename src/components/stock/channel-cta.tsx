interface ChannelCtaProps {
  compact?: boolean;
}

/**
 * Telegram channel CTA — retention tanpa gesekan register.
 * Channel = owned audience (bebas ketergantungan GSC); register tetap untuk fitur aktif (watchlist/alert).
 * URL di-inject via env NEXT_PUBLIC_TELEGRAM_CHANNEL_URL; fallback: t.me/teknikalid (kalau belum final).
 */
export function ChannelCta({ compact = false }: ChannelCtaProps) {
  const url = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || "https://t.me/teknikalid";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-[#229ED9]/30 bg-[#229ED9]/[0.06] ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"} font-medium text-[#229ED9] hover:bg-[#229ED9]/[0.12] transition-colors press-scale`}
      aria-label="Ikuti channel Telegram TeknikalID — brief pasar harian gratis"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.94 4.6 19.02 19.1c-.22 1-.8 1.24-1.62.77l-4.47-3.3-2.16 2.08c-.24.24-.44.44-.9.44l.32-4.55 8.28-7.48c.36-.32-.08-.5-.56-.18L6.93 13.1 2.72 11.8c-.91-.29-.93-.91.19-1.35l17.4-6.71c.76-.28 1.42.18 1.63 1.03z" />
      </svg>
      {compact ? "Brief harian di Telegram" : "Brief pasar harian — gratis di Telegram"}
    </a>
  );
}
