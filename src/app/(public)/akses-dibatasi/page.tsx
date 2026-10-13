import type { Metadata } from "next";
import Link from "next/link";
import { sanitizeReturnPath, secondsUntil } from "@/lib/access-limit";

// bug-2026-10-12-01 (PRD idea-2026-10-12-2): pengganti white-screen 403/429.
// Server component murni — 0 client-JS (AC2). Mobile-friendly: kartu sempit,
// tombol besar bertumpuk. noindex: halaman transient, bukan konten.
export const metadata: Metadata = {
  title: { absolute: "Akses Dibatasi Sementara | teknikal.id" },
  description:
    "Akses dari jaringan Anda dibatasi sementara setelah aktivitas sangat tinggi. Batas ini otomatis diangkat — pelajari caranya di sini.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ status?: string; path?: string; retry?: string }>;

function parseRetrySeconds(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const future = new Date(Date.now() + n * 1000).toISOString();
  return secondsUntil(future); // clamp 0..3600
}

export default async function AksesDibatasiPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = sp.status === "403" ? 403 : 429;
  const retrySeconds = parseRetrySeconds(sp.retry);
  const returnPath = sanitizeReturnPath(sp.path);
  const retryHref = returnPath ?? "/stocks";
  const menit = retrySeconds !== null ? Math.max(1, Math.ceil(retrySeconds / 60)) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="bg-bg-card depth-shadow rounded-xl p-6 sm:p-8 max-w-lg mx-auto space-y-5 text-center">
        <p className="text-5xl font-bold text-accent" aria-hidden="true">&#9888;</p>
        <h1 className="text-xl sm:text-2xl font-semibold">Akses Dibatasi Sementara</h1>

        <p className="text-text-secondary text-sm leading-relaxed">
          Kami mendeteksi aktivitas yang sangat tinggi dari jaringan internet yang Anda
          gunakan ({status === 403 ? "pembatasan aktif" : "batas permintaan terlampaui"}),
          sehingga akses ke halaman data saham dibatasi untuk sementara.
        </p>
        <p className="text-text-secondary text-sm leading-relaxed">
          Pembatasan ini otomatis dan tidak menunjukkan Anda melakukan kesalahan —
          jaringan seluler/ISP di Indonesia sering memakai satu alamat IP bersama
          untuk banyak pengguna sekaligus.
        </p>

        <p className="text-sm font-medium" data-retry-seconds={retrySeconds ?? undefined}>
          {menit !== null
            ? `Batas ini otomatis diangkat dalam ± ${menit} menit — silakan buka kembali setelahnya.`
            : "Batas ini biasanya otomatis diangkat dalam beberapa menit."}
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <Link
            href={retryHref}
            className="bg-text-primary text-white px-5 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity press-scale"
          >
            Coba Lagi
          </Link>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="bg-bg-card text-text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
            >
              Beranda
            </Link>
            <Link
              href="/berita"
              className="bg-bg-card text-text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
            >
              Berita Pasar
            </Link>
            <Link
              href="/community"
              className="bg-bg-card text-text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
            >
              Komunitas
            </Link>
          </div>
          <p className="text-text-secondary text-xs pt-1">
            Merasa ini keliru? Hubungi kami di komunitas{" "}
            <Link href="/community" className="text-accent hover:underline">
              teknikal.id/community
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
