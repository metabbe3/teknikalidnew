import Link from "next/link";
import { wibDayKey } from "@/lib/datetime-wib";

export interface DailyBriefHeroData {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date;
}

function relativeDayId(d: Date): string {
  // WIB calendar-day diff (raw UTC-day math mislabels across the 00:00 WIB line)
  const diff = Math.round(
    (new Date(wibDayKey(new Date())).getTime() - new Date(wibDayKey(d)).getTime()) / 86400000,
  );
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff < 7) return `${diff} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
}

/**
 * Featured daily-brief card on /berita — the market-wide NEWS brief series
 * (tickerTag null). Hidden entirely when no brief exists.
 */
export function DailyBriefHero({ brief }: { brief: DailyBriefHeroData | null }) {
  if (!brief) return null;

  return (
    <section aria-label="Brief pasar hari ini" className="mb-6">
      <Link
        href={`/berita/${brief.slug}`}
        className="group block rounded-xl border border-accent/25 bg-gradient-to-br from-accent/5 to-transparent p-5 hover:depth-shadow-hover transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            Brief Pasar Hari Ini
          </span>
          <span className="text-xs text-text-tertiary">{relativeDayId(new Date(brief.publishedAt))}</span>
        </div>
        <h2 className="mt-2.5 font-heading text-lg sm:text-xl font-bold text-text-primary leading-snug group-hover:text-accent transition-colors">
          {brief.title}
        </h2>
        {brief.excerpt && (
          <p className="mt-1.5 text-sm text-text-secondary leading-relaxed line-clamp-2">{brief.excerpt}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-accent group-hover:underline">
            Baca brief lengkap →
          </span>
          <span className="text-xs text-text-tertiary">
            Semua saham yang disebut otomatis terhubung ke chart-nya
          </span>
        </div>
      </Link>
      <p className="mt-2 text-center text-xs text-text-tertiary">
        Ingin brief seperti ini tiap hari?{" "}
        <Link href="/auth/register" className="font-semibold text-accent hover:underline">
          Daftar gratis
        </Link>
      </p>
    </section>
  );
}
