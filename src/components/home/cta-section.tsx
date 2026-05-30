import Link from "next/link";

export function CtaSection() {
  return (
    <div className="akademi-cta-banner p-8 sm:p-10 rounded-xl">
      <div className="relative z-10 space-y-4">
        <p className="text-xl sm:text-2xl font-bold text-white">
          Mulai Analisa Teknikal Sekarang
        </p>
        <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
          900+ saham BEI dengan chart interaktif, 30+ strategi screener, dan trading plan otomatis. Gratis, tanpa registrasi.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/stocks"
            className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors press-scale"
          >
            Lihat Semua Saham
          </Link>
          <Link
            href="/compare"
            className="bg-white/10 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors press-scale"
          >
            Bandingkan Saham
          </Link>
        </div>
      </div>
    </div>
  );
}
