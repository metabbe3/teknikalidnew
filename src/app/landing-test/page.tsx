// Kondisi-C (eksperimen murni 29 Okt): prompt simple + style hint, TANPA konteks teknikal.id.
// Metode yang dipakai = loop-discipline Antigravity saja (plan → build → verify → gaps).
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teknikal ID — Analisa Saham & IDX Gratis",
  description: "Platform analisa saham dan trading IDX gratis.",
};

const fitur = [
  { judul: "Chart Real-Time", desc: "Candlestick, garis, dan volume langsung dari bursa." },
  { judul: "Indikator Lengkap", desc: "RSI, MACD, moving average, dan banyak lagi." },
  { judul: "Screener Saham", desc: "Temukan saham sesuai kriteria dalam hitungan detik." },
  { judul: "Gratis Selamanya", desc: "Semua fitur dasar gratis, tanpa biaya tersembunyi." },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Navbar minimalis putih */}
      <nav className="flex items-center justify-between border-b border-sky-100 px-6 py-4">
        <span className="text-lg font-bold text-sky-600">teknikal id</span>
        <a href="/auth/signin" className="text-sm font-medium text-slate-500 hover:text-sky-600">
          Masuk
        </a>
      </nav>

      {/* Hero putih-biru muda */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <span className="rounded-full bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-600">
          Gratis untuk semua saham IDX
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Analisa saham jadi <span className="text-sky-500">sederhana</span>.
        </h1>
        <p className="max-w-xl text-lg text-slate-500">
          Chart, indikator, dan screener untuk trading harianmu — semuanya gratis.
        </p>
      </main>

      {/* Kartu fitur */}
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {fitur.map((f) => (
          <div
            key={f.judul}
            className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 text-left transition hover:border-sky-300 hover:bg-sky-50"
          >
            <h2 className="font-semibold text-slate-800">{f.judul}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="border-t border-sky-100 bg-sky-50/60 px-6 py-14 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Mulai hari ini, gratis.</h2>
        <p className="mt-2 text-slate-500">Tidak perlu kartu kredit.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/stocks"
            className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400"
          >
            Mulai Analisa
          </a>
          <a
            href="/auth/register"
            className="rounded-lg border border-sky-300 bg-white px-6 py-3 font-semibold text-sky-600 transition hover:border-sky-400"
          >
            Daftar
          </a>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="px-6 py-6 text-center text-xs text-slate-400">
        © 2026 teknikal id — analisa saham & IDX gratis. Bukan saran membeli.
      </footer>
    </div>
  );
}
