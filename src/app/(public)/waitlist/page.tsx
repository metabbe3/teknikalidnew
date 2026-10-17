import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/section-heading";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

export const dynamic = "force-dynamic"; // ISR trap doctrine + posisi antrean live

export const metadata = {
  title: "Waitlist Brief Pasar 06:30 — TeknikalID",
  description:
    "Dapatkan Brief Pasar IDX tiap pagi 06:30 langsung ke WhatsApp/email. Gratis, tanpa install aplikasi.",
  robots: { index: true, follow: true },
};

const WA_GATEWAY = "https://wa.me/62809917356"; // channel @teknikalid gateway
const WA_TEXT = encodeURIComponent(
  "Halo, saya mau ikut waitlist Brief Pasar 06:30 TeknikalID 📈",
);

async function QueuePosition() {
  const count = await prisma.waitlistSubscriber.count().catch(() => 0);
  return (
    <p className="text-xs text-text-tertiary font-mono">
      Antrean: <span className="text-text-primary font-bold">#{count + 1}</span> dari target 300 awal
    </p>
  );
}

export default function WaitlistPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <SectionHeading
        eyebrow="gratis · tanpa install"
        title="Brief Pasar 06:30, langsung ke WhatsApp kamu"
      />
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-5">
        <ul className="space-y-2 text-sm text-text-secondary">
          <li>🌅 <b className="text-text-primary">Setiap pagi 06:30</b> — rekap sesi kemarin + sinyal hari ini</li>
          <li>📊 Dari data teknikal.id sendiri: breadth, movers, golden/oversold screen</li>
          <li>🔒 Nomor WA <b className="text-text-primary">tidak dibagikan</b>, unsubscribe kapan saja</li>
        </ul>

        <WaitlistForm waLink={`${WA_GATEWAY}?text=${WA_TEXT}`} />

        <Suspense fallback={<p className="text-xs text-text-tertiary">Memuat posisi antrean…</p>}>
          <QueuePosition />
        </Suspense>

        <p className="text-[11px] text-text-tertiary leading-relaxed border-t border-border pt-4">
          Brief bersifat edukatif berdasarkan indikator teknikal, bukan rekomendasi jual-beli.
          Keputusan investasi sepenuhnya tanggung jawab Anda.
        </p>
      </div>
    </div>
  );
}
