import type { Metadata } from "next";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { SITE_URL } from "@/lib/constants";
import { SahamView } from "@/components/stock/saham-view";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Harga Crypto Hari Ini — BTC, ETH & 400+ Koin (IDR) + Screener | TeknikalID",
  description:
    "Harga crypto dalam Rupiah (Indodax) untuk ratusan koin. Browse semua koin atau gunakan Screener teknikal — RSI, MACD, SMA, sinyal trading crypto bahasa Indonesia.",
  alternates: { canonical: "/crypto" },
  keywords: ["harga crypto hari ini", "harga btc idr", "daftar crypto", "screener crypto", "analisa teknikal crypto", "bitcoin indonesia"],
  openGraph: {
    title: "Harga Crypto Hari Ini — 400+ Koin (IDR) + Screener | TeknikalID",
    description: "Harga crypto Rupiah (Indodax) + screener teknikal untuk ratusan koin. Chart, RSI, MACD, sinyal trading.",
    url: `${SITE_URL}/crypto`,
  },
};

export default async function CryptoPage() {
  const stocks = await stockMarketService.getCryptoList();

  return (
    <div className="fade-in">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <section className="space-y-5">
          <SectionHeading
            eyebrow="indodax · rupiah"
            title="Crypto"
            action={<span className="text-xs text-text-tertiary">{stocks.length} koin</span>}
          />
          <p className="text-sm text-text-secondary max-w-2xl">
            Harga crypto dalam Rupiah (data Indodax). Browse semua koin atau gunakan <strong>Screener</strong> untuk
            filter teknikal (RSI, MACD, SMA, golden cross, sinyal).
          </p>
          <SahamView
            stocks={stocks}
            sectors={["Crypto"]}
            assetClass="CRYPTO"
            browseLabel="Semua Crypto"
            linkBase="/crypto"
          />
        </section>
      </div>
    </div>
  );
}
