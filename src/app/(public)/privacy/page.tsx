import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi TeknikalID — bagaimana kami mengelola data Anda.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Overview</h2>
        <p>
          TeknikalID respects your privacy. We collect minimal data and do not track you
          across the web. This policy explains what information we collect and how we use it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Analytics</h2>
        <p>
          We use Plausible Analytics, a privacy-friendly, cookie-free analytics service.
          Plausible does not use cookies, does not collect personal data, and is fully compliant
          with GDPR, CCPA, and PECB. We collect only aggregate metrics: page views, referral
          source, country (based on IP, which is never stored), and device type.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">What We Do Not Collect</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>No cookies</li>
          <li>No personal information (name, email, phone)</li>
          <li>No cross-site tracking</li>
          <li>No fingerprinting</li>
          <li>No individual user profiles</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Data We Process</h2>
        <p>
          When you visit TeknikalID, our servers temporarily process your request to deliver
          stock data. We do not store your IP address, browser history, or any identifying
          information. Server logs are kept to a minimum and are not used for tracking.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Third-Party Services</h2>
        <p>
          Stock data is fetched from Yahoo Finance. Your interaction with TeknikalID does not
          send any personal data to Yahoo Finance. We do not use advertising networks, social
          media trackers, or any other third-party tracking services.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Changes</h2>
        <p>
          We may update this privacy policy from time to time. Changes will be reflected on this
          page with an updated revision date.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Contact</h2>
        <p>
          If you have questions about this privacy policy, please reach out via the contact
          information provided on this website.
        </p>
      </section>
    </LegalPage>
  );
}
