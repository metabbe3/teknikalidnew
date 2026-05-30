import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Disclaimer platform analisa teknikal saham TeknikalID. Data bersifat informasi dan bukan rekomendasi investasi.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Not Financial Advice</h2>
        <p>
          TeknikalID provides technical analysis tools and data for informational and educational
          purposes only. Nothing on this website constitutes financial, investment, tax, or legal
          advice. You should not treat any information on TeknikalID as a recommendation to buy,
          sell, or hold any security or financial instrument.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Data Accuracy</h2>
        <p>
          Stock data is sourced from Yahoo Finance and is subject to a delay of approximately
          5–10 minutes. While we strive to present accurate data, we make no warranties about the
          completeness, reliability, or accuracy of this information. Data may contain errors or
          omissions.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Technical Indicators</h2>
        <p>
          Technical indicators (RSI, MACD, Bollinger Bands, SMA, EMA, etc.) are mathematical
          calculations based on historical price data. They do not predict future price movements
          and should not be used as the sole basis for investment decisions. Past performance is
          not indicative of future results.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Limitation of Liability</h2>
        <p>
          TeknikalID and its contributors shall not be held liable for any losses or damages
          arising from the use of information provided on this platform. You are solely
          responsible for your investment decisions and should consult a qualified financial
          advisor before making any investment.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Third-Party Data</h2>
        <p>
          Market data is provided by Yahoo Finance. TeknikalID is not affiliated with Yahoo
          Finance or the Indonesia Stock Exchange (IDX). All trademarks and company names belong
          to their respective owners.
        </p>
      </section>
    </LegalPage>
  );
}
