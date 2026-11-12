import { prisma } from "@/lib/prisma";
import { IDX40, SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import KURASI_KEEP from "@/lib/seo/kurasi-keep";

export const dynamic = "force-dynamic";

export async function GET() {
  const [questions, articles] = await Promise.all([
    prisma.question.findMany({
      where: { status: "ANSWERED" },
      select: {
        question: true,
        shortAnswer: true,
        slug: true,
        category: true,
      },
      orderBy: { helpfulVotes: "desc" },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        articleType: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
  ]);

  // prd-2026-11-07-01 (llms.txt v2): seksi "Kenapa Saham Naik/Turun Hari Ini".
  // Data = jalur SATU PINTU yang sama dengan sitemap.ts kenapa-* pages:
  // stockMarketService.getStockList() (cache 5 menit) — DILARANG query
  // pergerakan baru independen (breadth-rule qa-30-01). Set item: tanggal
  // sesi EOD (WIB) + 1 angka ground-truth changePercent close-vs-prev.
  const kenapa = await (async () => {
    try {
      const [list, snapshot] = await Promise.all([
        stockMarketService.getStockList(),
        marketSnapshotService.getSnapshot(),
      ]);
      const sessionDate = snapshot.sessionDate; // ISO yyyy-mm-dd EOD terakhir
      const items = list
        .map((s) => ({
          // Sama seperti sitemap: hanya survivor ADV-2 (KURASI_KEEP).
          ticker: s.ticker.replace(/\.JK$/, "").toUpperCase(),
          name: s.name,
          changePercent: s.changePercent,
        }))
        .filter(
          (s) =>
            KURASI_KEEP.has(s.ticker) &&
            s.changePercent !== null &&
            s.changePercent !== 0,
        )
        // 30 gerak terbesar (|pct|) supaya korpus selalu berisi hari yang
        // benar-benar bergerak — bukan alfabetis diam.
        .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!))
        .slice(0, 30);
      return { sessionDate, items };
    } catch {
      // Fail-soft: seksi dilewati, llms.txt tetap tersaji tanpa seksi baru.
      return { sessionDate: null as string | null, items: [] as { ticker: string; name: string; changePercent: number | null }[] };
    }
  })();

  const lines: string[] = [];

  // Header
  lines.push("# TeknikalID");
  lines.push("#> Platform analisis teknikal saham Indonesia (IDX)");
  lines.push(`#> ${SITE_URL}`);
  lines.push("");
  lines.push(
    "TeknikalID adalah platform analisis teknikal untuk Bursa Efek Indonesia (IDX). " +
      "Menyediakan chart profesional, indikator teknikal (RSI, MACD, Bollinger Bands, SMA, EMA, Stochastic, ADX), " +
      "screener saham, berita pasar, edukasi trading, dan komunitas diskusi.",
  );
  lines.push("");

  // FAQ Section
  lines.push("## FAQ — Tanya Jawab Saham & Analisis Teknikal");
  lines.push("");
  for (const q of questions) {
    lines.push(`### Q: ${q.question}`);
    lines.push(`A: ${q.shortAnswer}`);
    lines.push(`URL: ${SITE_URL}/akademi/tanya/${q.slug}`);
    lines.push(`Kategori: ${q.category}`);
    lines.push("");
  }

  // Articles Section
  lines.push("## Artikel & Berita");
  lines.push("");
  for (const a of articles) {
    lines.push(`### ${a.title}`);
    if (a.excerpt) {
      lines.push(a.excerpt);
    }
    lines.push(`URL: ${SITE_URL}/berita/${a.slug}`);
    lines.push(`Tipe: ${a.articleType}`);
    lines.push("");
  }

  // Kenapa-naik/turun pages (prd-2026-11-07-01): korpus mesin-terbaca utk
  // answer-engine — tanggal sesi + 1 angka ground-truth per item (GEO:
  // sitasi angka > keyword stuffing). 30 mover terbesar per sesi EOD.
  if (kenapa.items.length > 0) {
    lines.push("## Kenapa Saham Naik/Turun Hari Ini");
    lines.push("");
    if (kenapa.sessionDate) {
      lines.push(
        `Sesi: ${kenapa.sessionDate} (EOD Bursa Efek Indonesia, WIB)`,
      );
      lines.push("");
    }
    for (const k of kenapa.items) {
      const dir = (k.changePercent ?? 0) > 0 ? "Naik" : "Turun";
      const cleanTicker = k.ticker.toLowerCase();
      lines.push(
        `### Kenapa Saham ${k.ticker} ${dir} — ${k.name}`,
      );
      lines.push(
        `${k.ticker} bergerak ${(k.changePercent ?? 0) > 0 ? "+" : ""}${(k.changePercent ?? 0).toFixed(2)}% pada sesi ${kenapa.sessionDate ?? "terbaru"} (close vs penutupan sebelumnya, data teknikal.id).`,
      );
      lines.push(
        `URL: ${SITE_URL}/saham/${cleanTicker}/kenapa-${dir === "Naik" ? "naik" : "turun"}-hari-ini`,
      );
      lines.push("Kategori: Kenapa Saham Naik/Turun");
      lines.push("");
    }
  }

  // Stock list
  lines.push("## Saham IDX40");
  lines.push("");
  lines.push("Daftar saham yang dicakup oleh TeknikalID:");
  lines.push("");
  for (const stock of IDX40) {
    lines.push(
      `- ${stock.ticker}: ${stock.name} (${stock.sector}) — ${SITE_URL}/stocks/${stock.ticker}`,
    );
  }
  lines.push("");

  // Optional paths
  lines.push("## Halaman Penting");
  lines.push("");
  lines.push(`- Homepage: ${SITE_URL}`);
  lines.push(`- Screener Saham: ${SITE_URL}/screener`);
  lines.push(`- Akademi / Edukasi: ${SITE_URL}/akademi`);
  lines.push(`- Tanya Jawab FAQ: ${SITE_URL}/akademi?tab=faq`);
  lines.push(`- Komunitas: ${SITE_URL}/community`);
  lines.push(`- Watchlist: ${SITE_URL}/watchlist`);
  lines.push(`- Berita: ${SITE_URL}/berita`);
  lines.push(`- Pasar Hari Ini (live): ${SITE_URL}/pasar`);
  lines.push(`- Saham Oversold Hari Ini: ${SITE_URL}/saham-oversold`);
  lines.push(`- Saham Volume Spike: ${SITE_URL}/saham-volume-spike`);
  lines.push(`- Saham Golden Cross: ${SITE_URL}/saham-golden-cross`);
  lines.push("");

  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
