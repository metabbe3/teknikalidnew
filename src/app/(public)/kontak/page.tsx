import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kontak — TeknikalID",
  description:
    "Hubungi TeknikalID: email support, Instagram, dan kanal komunitas. Dibangun dan dikelola oleh Nicholas Andrian Surjadi.",
  alternates: { canonical: "/kontak" },
};

export default function KontakPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Kontak</h1>
      <p className="text-muted-foreground mb-8">
        Pertanyaan, koreksi data, saran fitur, atau kerja sama — semua sampai ke
        pembangun situs ini langsung.
      </p>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-2">Instagram (jalur tercepat)</h2>
          <p className="text-sm text-muted-foreground mb-3">
            DM untuk pertanyaan, koreksi data, atau saran fitur — dibalas dalam
            1×24 jam hari kerja.
          </p>
          <a
            href="https://instagram.com/teknikal.id"
            className="text-primary underline underline-offset-4"
            rel="noopener noreferrer"
            target="_blank"
          >
            @teknikal.id
          </a>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-2">Threads</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Update radar pasar harian dan diskusi analisis.
          </p>
          <a
            href="https://www.threads.net/@teknikal.id"
            className="text-primary underline underline-offset-4"
            rel="noopener noreferrer"
            target="_blank"
          >
            @teknikal.id di Threads
          </a>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-2">Siapa yang bertanggung jawab</h2>
          <p className="text-sm text-muted-foreground">
            TeknikalID dibangun dan dikelola oleh satu orang:{" "}
            <Link href="/about" className="text-primary underline underline-offset-4">
              Nicholas Andrian Surjadi
            </Link>{" "}
            — Technical Risk Engineer. Seluruh analisis dihasilkan dari{" "}
            <Link href="/metodologi" className="text-primary underline underline-offset-4">
              metodologi yang terbuka
            </Link>
            , bukan opini pribadi.
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          TeknikalID bukan penasihat investasi terdaftar. Lihat{" "}
          <Link href="/disclaimer" className="underline underline-offset-4">
            disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
