import type { Metadata } from "next";
import { Check } from "lucide-react";
import { HargaFreeCta } from "@/components/harga/harga-free-cta";
import { buildCustomFaqJsonLd } from "@/lib/faq-jsonld";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  buildPricingCards,
  getHargaFaqs,
  PRICING_DISCLAIMER,
} from "./pricing-data";

export const metadata: Metadata = {
  title: "Harga Langganan Teknikal.id",
  description:
    "Pilihan paket asisten trading saham IDX: mulai gratis di web atau upgrade bot Telegram mulai Rp14.900/bulan.",
  alternates: { canonical: "/harga" },
};

export default function HargaPage() {
  const cards = buildPricingCards();
  const faqs = getHargaFaqs();
  const faqJsonLd = buildCustomFaqJsonLd(faqs);

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16 space-y-12">
        {/* Header / Hero Section */}
        <section className="text-center space-y-3">
          <p className="inline-block rounded-md border border-border bg-bg-surface px-3 py-1 font-mono text-xs text-text-secondary">
            TRANSPARAN &amp; TANPA POTONG OTOMATIS
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Harga Langganan Teknikal.id
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-text-secondary leading-relaxed">
            Gunakan fitur analisa teknikal dan Tanya AI di web gratis selamanya, atau
            upgrade ke asisten bot Telegram untuk pantauan watchlist dan alert level harga otomatis 24/7.
          </p>
        </section>

        {/* Pricing Cards Grid: Mobile (<md) kartu susun vertikal, Night Trader ring/border accent halus */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {cards.map((card) => {
            const isFree = card.tier === "Free";

            return (
              <div
                key={card.tier}
                className={`relative flex flex-col justify-between rounded-xl p-6 transition-all ${
                  card.isPopular
                    ? "border-2 border-accent bg-bg-card shadow-lg ring-1 ring-accent/30"
                    : "border border-border bg-bg-card shadow-sm"
                }`}
              >
                {card.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-[11px] font-semibold text-white tracking-wider shadow-sm">
                    {card.badge}
                  </span>
                )}

                <div className="space-y-4">
                  {/* Header tier */}
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-text-primary">{card.tier}</h2>
                    <p className="text-xs text-text-secondary min-h-[32px] leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="border-b border-border/60 pb-4">
                    <div className="flex items-baseline gap-1.5">
                      {card.originalPrice && (
                        <span className="text-sm font-medium text-text-tertiary line-through">
                          {card.originalPrice}
                        </span>
                      )}
                      <span className="text-3xl font-extrabold text-text-primary">
                        {card.price}
                      </span>
                      <span className="text-xs font-normal text-text-tertiary">
                        {card.period}
                      </span>
                    </div>
                    {card.originalPrice && (
                      <p className="mt-1 text-[11px] text-text-tertiary">
                        Promo bulan pertama, selanjutnya {card.originalPrice}/bulan
                      </p>
                    )}
                    {isFree && (
                      <p className="mt-1 text-[11px] text-text-tertiary">
                        Tanpa kartu kredit, gratis selamanya di web
                      </p>
                    )}
                  </div>

                  {/* Feature List */}
                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                      Fitur yang didapat:
                    </p>
                    <ul className="space-y-2 text-xs sm:text-sm text-text-secondary">
                      {card.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check
                            className="h-4 w-4 shrink-0 text-accent mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Action */}
                <div className="pt-6 mt-6 border-t border-border/40">
                  {isFree ? (
                    <HargaFreeCta />
                  ) : (
                    <div>
                      <a
                        href={card.ctaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all press-scale ${
                          card.isPopular
                            ? "bg-accent text-white shadow hover:bg-accent/90"
                            : "border border-border bg-bg-surface text-text-primary hover:border-accent hover:text-accent"
                        }`}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span>{card.ctaLabel}</span>
                      </a>
                      {card.paymentNote && (
                        <p className="mt-2 text-center text-[11px] text-text-tertiary">
                          {card.paymentNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Perbandingan Singkat Web vs Telegram */}
        <section className="rounded-xl border border-border bg-bg-card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Kenapa Berlangganan Asisten Telegram?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 text-xs sm:text-sm text-text-secondary">
            <div className="space-y-1 rounded-lg border border-border/60 bg-bg-surface p-4">
              <p className="font-semibold text-text-primary">Alert Level Harga 24/7</p>
              <p className="leading-relaxed">
                Bot memantau pergerakan harga saham dan mengirim pesan instan ke Telegram saat level support, resistance, atau target tersentuh.
              </p>
            </div>
            <div className="space-y-1 rounded-lg border border-border/60 bg-bg-surface p-4">
              <p className="font-semibold text-text-primary">Blast Watchlist &amp; Brief Sore</p>
              <p className="leading-relaxed">
                Dapatkan rangkuman performa saham pantauan setiap penutupan bursa pukul 15:35 WIB langsung di genggaman Anda.
              </p>
            </div>
            <div className="space-y-1 rounded-lg border border-border/60 bg-bg-surface p-4">
              <p className="font-semibold text-text-primary">Analisa Instan Kapan Saja</p>
              <p className="leading-relaxed">
                Cukup kirim kode saham (contoh: BBCA) di Telegram untuk melihat analisis tren, indikator teknikal, dan ringkasan level penting.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section: 3 Q&A statis server-rendered */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Pertanyaan umum seputar langganan asisten bot Telegram Teknikal.id.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border bg-bg-card p-4 sm:p-5 transition-colors"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-text-primary list-none">
                  <span>{faq.question}</span>
                  <span className="text-xs text-text-tertiary transition-transform duration-200 group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 border-t border-border/40 pt-3 text-xs sm:text-sm leading-relaxed text-text-secondary">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Footer Disclaimer */}
        <footer className="pt-6 border-t border-border/60 text-center">
          <p className="text-xs text-text-tertiary max-w-3xl mx-auto leading-relaxed">
            {PRICING_DISCLAIMER}
          </p>
        </footer>
      </div>
    </>
  );
}
