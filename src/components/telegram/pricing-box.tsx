"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgentCtx } from "@/components/telegram/subscribe-cta";

function computeTrialDaysLeft(
  trialCreatedAt?: string | null,
  fallbackDays?: number
): number {
  if (trialCreatedAt) {
    const createdMs = new Date(trialCreatedAt).getTime();
    if (Number.isFinite(createdMs)) {
      const endMs = createdMs + 7 * 86400_000;
      const diffMs = endMs - Date.now();
      if (diffMs > 0) {
        return Math.max(1, Math.ceil(diffMs / 86400_000));
      }
      return 0;
    }
  }
  return fallbackDays && fallbackDays > 0 ? fallbackDays : 0;
}

export function AgentTrialBanner() {
  const { mem, loading, hasProvider } = useAgentCtx();
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!hasProvider || loading || !mem?.email || mem.status === "paid") {
    return null;
  }

  const daysLeft = computeTrialDaysLeft(mem.trialCreatedAt, mem.trialDaysLeft);
  const isTrialActive =
    (mem.status === "trial" && mem.tier === "pro" && daysLeft > 0) ||
    (Boolean(mem.trialUsed) && daysLeft > 0);

  const handleActivateTrial = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      const r = await fetch("/api/agent/trial-start", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        days?: number;
        message?: string;
      };
      if (r.ok && j.ok) {
        window.location.reload();
        return;
      }
      setErrMsg(j.message ?? "Gagal mengaktifkan trial — coba lagi.");
    } catch {
      setErrMsg("Gagal mengaktifkan trial — periksa koneksi Anda.");
    } finally {
      setBusy(false);
    }
  };

  if (isTrialActive) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3"
        data-testid="agent-trial-badge-box"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
            data-testid="agent-trial-badge"
          >
            Trial Pro — {daysLeft} hari lagi
          </span>
          <span className="text-xs text-text-secondary">
            Semua fitur Pro aktif selama masa percobaan 7 hari.
          </span>
        </div>
      </div>
    );
  }

  if (mem.trialUsed) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="agent-trial-banner"
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-text-primary">
          Akun terdaftar berhak coba paket Pro penuh selama 7 hari
        </p>
        <p className="text-xs text-text-secondary">
          Sekali seumur akun, tanpa kartu kredit, dan tanpa pemotongan saldo otomatis.
        </p>
        {errMsg && <p className="text-xs text-rose-600">{errMsg}</p>}
      </div>
      <Button
        onClick={handleActivateTrial}
        disabled={busy}
        className="shrink-0"
        data-testid="agent-trial-start-btn"
      >
        {busy ? "Mengaktifkan Trial…" : "Aktifkan Trial Pro 7 Hari — Gratis"}
      </Button>
    </div>
  );
}

export function PricingBox() {
  const { mem, paying, payingTier, msg, hasProvider, checkout } = useAgentCtx();
  const tierName = (t: string | null | undefined) =>
    t === "basic" ? "Night Trader" : t === "pro" ? "Pro" : t ? t.toUpperCase() : "-";

  return (
    <div className="space-y-4" data-testid="pricing-box">
      <AgentTrialBanner />

      {mem?.status === "paid" ? (
        <Card>
          <CardContent className="space-y-1 pt-6 text-sm">
            <p className="font-semibold">Paket aktif: {tierName(mem.tier)}</p>
            {mem.periodEnd && (
              <p className="text-text-secondary">
                Aktif s/d {new Date(mem.periodEnd).toLocaleDateString("id-ID")}
              </p>
            )}
            <p className="text-text-secondary">
              Kuota bulan ini: {mem.turnsUsed}/{mem.maxTurns} turn
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Kolom 1: Coba Gratis */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-bg-card p-5">
            <div className="space-y-3">
              <p className="font-semibold text-text-primary">Coba Gratis</p>
              <p className="text-sm text-text-secondary">
                Untuk mencoba respons analisis bot sebelum berlangganan.
              </p>
              <p className="text-2xl font-bold text-text-primary">
                Rp0
                <span className="text-xs font-normal text-text-tertiary"> /hari</span>
              </p>
              <p className="text-xs text-text-secondary">
                3 tanya/hari (guest), tanpa kartu kredit.
              </p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li>3 tanya/hari gratis untuk cek saham pilihan</li>
                <li>Ringkasan posisi support, resistance, dan tren</li>
                <li>Tanpa kartu kredit, tanpa potong otomatis</li>
                <li>Data grafik &amp; tabel di web tetap gratis selamanya</li>
              </ul>
            </div>
            <Link
              href="/agent"
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
            >
              Pakai 3 Chat Gratis
            </Link>
          </div>

          {/* Kolom 2: Night Trader — PILIHAN UTAMA */}
          <div className="relative flex flex-col justify-between space-y-3 rounded-xl border-2 border-accent bg-bg-card p-5">
            <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
              PILIHAN UTAMA
            </span>
            <div className="space-y-3">
              <p className="font-semibold text-text-primary">Night Trader</p>
              <p className="text-sm text-text-secondary">
                Untuk trader swing dan pekerja kantoran yang menyusun rencana trading tiap malam.
              </p>
              {mem?.promoUsed ? (
                <p className="text-2xl font-bold text-text-primary">
                  Rp29.000
                  <span className="text-xs font-normal text-text-tertiary"> /bulan</span>
                </p>
              ) : (
                <p className="text-2xl font-bold text-text-primary">
                  <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">
                    Rp29.000
                  </span>
                  Rp14.900
                  <span className="text-xs font-normal text-text-tertiary"> /bulan pertama</span>
                </p>
              )}
              <p className="text-xs text-text-secondary">
                Bulan berikutnya Rp29.000/bulan. Kurang dari Rp1.000/hari — lebih murah dari parkir motor.
              </p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li>150 kuota tanya bot per bulan (rata-rata 7x tanya saham tiap hari bursa)</li>
                <li>Simpan hingga 10 saham di watchlist pantauan</li>
                <li>10 alert harga aktif otomatis via Telegram</li>
                <li>Ringkasan support, resistance, tren, dan volume harian</li>
              </ul>
            </div>
            <Button
              onClick={() => checkout("basic")}
              disabled={paying || (hasProvider && !mem?.chatBound)}
              className="group relative w-full overflow-hidden"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shine_1s] motion-reduce:group-hover:animate-none"
              />
              {payingTier === "basic"
                ? "Memproses Night Trader…"
                : mem?.promoUsed
                  ? "Langganan Night Trader"
                  : "Ambil Bulan Pertama Rp14.900"}
            </Button>
          </div>

          {/* Kolom 3: Pro */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-bg-card p-5">
            <div className="space-y-3">
              <p className="font-semibold text-text-primary">Pro</p>
              <p className="text-sm text-text-secondary">
                Untuk trader aktif yang memantau banyak saham dan pergerakan sektor setiap hari.
              </p>
              {mem?.promoUsed ? (
                <p className="text-2xl font-bold text-text-primary">
                  Rp79.000
                  <span className="text-xs font-normal text-text-tertiary"> /bulan</span>
                </p>
              ) : (
                <p className="text-2xl font-bold text-text-primary">
                  <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">
                    Rp79.000
                  </span>
                  Rp29.000
                  <span className="text-xs font-normal text-text-tertiary"> /bulan pertama</span>
                </p>
              )}
              <p className="text-xs text-text-secondary">Bulan berikutnya Rp79.000/bulan.</p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li>400 kuota tanya bot per bulan (leluasa sekitar 20x tiap hari bursa)</li>
                <li>Simpan hingga 25 saham di watchlist pantauan</li>
                <li>25 alert harga aktif otomatis via Telegram</li>
                <li>Cocok untuk cek banyak saham sekaligus saat jam pasar buka</li>
              </ul>
            </div>
            <Button
              onClick={() => checkout("pro")}
              disabled={paying || (hasProvider && !mem?.chatBound)}
              variant="outline"
              className="w-full"
            >
              {payingTier === "pro"
                ? "Memproses Pro…"
                : mem?.promoUsed
                  ? "Langganan Pro"
                  : "Ambil Pro Bulan Pertama Rp29.000"}
            </Button>
          </div>
        </div>
      )}

      {hasProvider && !mem?.chatBound && mem?.status !== "paid" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Hubungkan Telegram dulu (Langkah 2) untuk membayar.
        </p>
      )}
      {msg && <p className="text-sm text-rose-600">{msg}</p>}
    </div>
  );
}
