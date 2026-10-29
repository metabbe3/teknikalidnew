// LANDING STANDALONE (kondisi-B eksperimen Antigravity 29 Okt):
// pakai root layout (tanpa Header/Footer global teknikal.id) — route group sendiri.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TeknikalID — Analisa Teknikal Saham Indonesia",
};

const fitur = [
  { judul: "Chart Pro", desc: "Candlestick interaktif + 12 indikator" },
  { judul: "Screener", desc: "Filter 950+ saham IDX sekali klik" },
  { judul: "Skor Sinyal", desc: "Ringkasan teknikal otomatis per saham" },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-900 to-slate-900 text-white">
      {/* nav minimal (landing milik sendiri — bukan header global) */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold">TeknikalID</span>
        <a href="/auth/signin" className="text-sm text-blue-200 hover:text-white">
          Masuk
        </a>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-3xl text-4xl font-bold sm:text-5xl">
          Analisa teknikal saham Indonesia, jadi mudah
        </h1>
        <p className="max-w-xl text-lg text-blue-200">
          Chart, screener, dan sinyal untuk 950+ saham IDX. Gratis dipakai.
        </p>
        <div className="flex gap-4">
          <a
            href="/stocks"
            className="rounded-lg bg-blue-500 px-6 py-3 font-semibold hover:bg-blue-400"
          >
            Mulai Gratis
          </a>
          <a
            href="/auth/register"
            className="rounded-lg border border-blue-300 px-6 py-3 font-semibold hover:bg-blue-800"
          >
            Daftar
          </a>
        </div>
      </main>

      <section className="grid gap-4 px-6 pb-16 sm:grid-cols-3">
        {fitur.map((f) => (
          <div
            key={f.judul}
            className="rounded-xl border border-blue-400/30 bg-blue-950/40 p-5 text-left"
          >
            <h2 className="font-semibold">{f.judul}</h2>
            <p className="mt-1 text-sm text-blue-200">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
