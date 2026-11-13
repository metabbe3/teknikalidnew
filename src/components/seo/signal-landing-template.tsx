import type { ReactNode } from "react";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { SahamStrategyLinks } from "@/components/seo/saham-strategy-links";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { ConditionHistory } from "@/components/signal/condition-history";
import {
  CONDITION_KEYS,
  getConditionBacktest,
  type ConditionKey,
} from "@/lib/condition-backtest.service";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import { SITE_URL } from "@/lib/constants";
import { Search } from "lucide-react";
import { GuestStar } from "@/components/stock/guest-star";

export interface SignalLandingFaq {
  question: string;
  answer: string;
}

export interface SignalLandingTemplateProps {
  preset: string;
  canonicalPath: string;
  title: string;
  schemaDescription: string;
  heroDescription: ReactNode;
  educationalTitle: string;
  educationalBody: ReactNode;
  emptyText: string;
  askAiQuestion: string;
  faqs: SignalLandingFaq[];
}

export async function SignalLandingTemplate({
  preset,
  canonicalPath,
  title,
  schemaDescription,
  heroDescription,
  educationalTitle,
  educationalBody,
  emptyText,
  askAiQuestion,
  faqs,
}: SignalLandingTemplateProps) {
  const { stocks, failed } = await fetchScreenerRows(preset);

  let conditionHistory: Awaited<ReturnType<typeof getConditionBacktest>> | null = null;
  if ((CONDITION_KEYS as readonly string[]).includes(preset)) {
    try {
      conditionHistory = await getConditionBacktest(preset as ConditionKey);
    } catch (e) {
      console.error("[condition-history] gagal:", e instanceof Error ? e.message : e);
    }
  }

  const topScored = [...stocks]
    .filter((s): s is typeof s & { ticker: string; signalScore: number } => {
      const row = s as { ticker?: string; signalScore?: number | null };
      return typeof row.signalScore === "number" && Number.isFinite(row.signalScore);
    })
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 3);

  const topScoredText =
    topScored.length > 0
      ? ` · 3 skor tertinggi hari ini: ${topScored
          .map(
            (s) =>
              `${stripJk(s.ticker)} (${
                s.signalScore > 0 ? "+" : ""
              }${formatDecimalId(s.signalScore, 2)})`
          )
          .join(", ")}`
      : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: title,
        description: schemaDescription,
        url: `${SITE_URL}${canonicalPath}`,
      },
      {
        "@type": "ItemList",
        name: title,
        numberOfItems: stocks.length,
        itemListElement: stocks.slice(0, 20).map((stock, i) => {
          const s = stock as { ticker: string; name: string };
          return {
            "@type": "ListItem",
            position: i + 1,
            name: `${stripJk(s.ticker)} — ${s.name}`,
            url: `${SITE_URL}/stocks/${s.ticker}`,
          };
        }),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      {failed && <meta name="robots" content="noindex" />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <PageHero eyebrow="Saham IDX" title={title} description={heroDescription} />

      <div className="mx-auto max-w-5xl px-4 pt-6">
        <p
          className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary"
          data-seo-dr="live-count"
        >
          Per{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          })}
          , terdapat{" "}
          <strong className="text-text-primary">{stocks.length} saham aktif BEI</strong>{" "}
          yang lolos saringan ini{topScoredText} — daftar lengkap di bawah, gratis tanpa login.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="rounded-lg border border-bullish/30 bg-bullish/5 p-4 text-sm text-text-secondary leading-relaxed space-y-2">
          <p className="font-semibold text-text-primary">{educationalTitle}</p>
          <div className="space-y-2">{educationalBody}</div>
        </div>

        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={`Tabel ${title}`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Ticker</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Nama</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Harga</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Perubahan</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Skor Sinyal</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Pantau</th>
              </tr>
            </thead>
            <tbody>
              {failed ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary">
                    Data sedang diperbarui — muat ulang sebentar lagi.
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const s = stock as {
                    ticker: string;
                    name: string;
                    close: number | null;
                    changePercent: number | null;
                    signalScore: number | null;
                  };
                  return (
                    <tr key={s.ticker} className="border-b border-border/60 hover:bg-bg-hover/50">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/stocks/${s.ticker}`}
                          className="font-semibold text-accent hover:underline inline-block py-1.5 font-mono"
                        >
                          {stripJk(s.ticker)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{s.name}</td>
                      <td className="py-2 pr-4 text-text-primary tabular-nums">
                        <span data-live-price={s.ticker}>
                          {s.close !== null ? formatPrice(s.close) : "—"}
                        </span>
                      </td>
                      <td
                        className={`py-2 pr-4 tabular-nums ${
                          s.changePercent !== null ? changeColor(s.changePercent) : ""
                        }`}
                      >
                        {s.changePercent !== null ? formatPercent(s.changePercent) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-4 font-mono tabular-nums ${
                          s.signalScore !== null
                            ? s.signalScore > 0
                              ? "text-bullish"
                              : s.signalScore < 0
                                ? "text-bearish"
                                : ""
                            : ""
                        }`}
                      >
                        {s.signalScore !== null
                          ? s.signalScore > 0
                            ? `+${formatDecimalId(s.signalScore, 2)}`
                            : formatDecimalId(s.signalScore, 2)
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <GuestStar ticker={s.ticker} compact />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {conditionHistory && <ConditionHistory result={conditionHistory} />}

          <div className="mt-4">
            <a
              href="https://t.me/TeknikalidAgentBot?start=web_screener_tematik"
              target="_blank"
              rel="noopener noreferrer"
              data-engagement="funnel_seoHubBotCta"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 shrink-0"><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/><path d="M10.268 21a2 2 0 0 0 3.464 0"/></svg>Dapatkan notifikasi sinyal harian via Telegram →
            </a>
          </div>
        </div>

        <section
          aria-label="Pertanyaan umum"
          className="rounded-xl border border-border bg-bg-card p-5 space-y-3"
        >
          <h2 className="text-base font-bold text-text-primary">Pertanyaan Umum</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="group">
                <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                  {f.question}
                </summary>
                <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <AskAiCta question={askAiQuestion} />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/stocks?view=screener"
            className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90"
          >
            <Search className="inline h-4 w-4 mr-1" /> Screener Lengkap
          </Link>
          <Link
            href="/indeks/lq45"
            data-engagement="nav_indeksCrossLink"
            className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover"
          >
            Indeks LQ45 BEI →
          </Link>
          <Link
            href="/indeks/idxbumn20"
            data-engagement="nav_indeksCrossLink"
            className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover"
          >
            Daftar Saham BUMN (IDX BUMN20) →
          </Link>
        </div>

        <SahamStrategyLinks compact />
      </div>
    </>
  );
}
