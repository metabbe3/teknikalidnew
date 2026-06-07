import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Ketentuan Layanan",
  description: "Ketentuan layanan TeknikalID — syarat dan ketentuan penggunaan platform analisa teknikal saham.",
  alternates: { canonical: "/terms" },
};

export const revalidate = 86400;

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Acceptance of Terms</h2>
        <p>
          By accessing and using TeknikalID, you accept and agree to be bound by these terms of
          service. If you do not agree, please do not use this website.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Use of Service</h2>
        <p>
          TeknikalID provides technical analysis data and tools for Indonesia Stock Exchange
          (IDX) stocks. The service is provided free of charge for personal, non-commercial use.
          You agree not to:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Use automated systems to scrape or bulk-download data from this website</li>
          <li>Attempt to overload or disrupt the service</li>
          <li>Redistribute data from this service without permission</li>
          <li>Use the service for any unlawful purpose</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Intellectual Property</h2>
        <p>
          The TeknikalID website, including its design, code, and original content, is the
          intellectual property of TeknikalID. Stock data is sourced from third-party providers
          and is subject to their respective terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">No Warranty</h2>
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
          of any kind, either express or implied. We do not guarantee that the service will be
          uninterrupted, timely, secure, or error-free.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Limitation of Liability</h2>
        <p>
          In no event shall TeknikalID be liable for any indirect, incidental, special,
          consequential, or punitive damages arising from your use of the service. This includes
          any financial losses resulting from investment decisions made based on data provided
          by TeknikalID.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the service
          after changes constitutes acceptance of the updated terms.
        </p>
      </section>
    </LegalPage>
  );
}
