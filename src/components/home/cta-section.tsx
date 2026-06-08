import Link from "next/link";

export function CtaSection() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f172a] p-8 sm:p-10">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-lg space-y-4">
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Analisa 950+ saham dalam hitungan detik
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Chart interaktif, 30+ strategi screener, dan trading plan otomatis. Gratis, tanpa registrasi.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/stocks"
            className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors press-scale"
          >
            Lihat Semua Saham
          </Link>
          <Link
            href="/screener"
            className="border border-white/20 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/10 transition-all press-scale"
          >
            Coba Screener
          </Link>
        </div>
      </div>
    </div>
  );
}
