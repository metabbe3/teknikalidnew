"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgentCtx } from "@/components/telegram/subscribe-cta";
import { buildPricingCards } from "@/app/(public)/harga/pricing-data";
import { StockAiChip } from "@/components/stock/stock-ai-chip";

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
  const { mem } = useAgentCtx();
  const tierName = (t: string | null | undefined) =>
    t === "basic" ? "Night Trader" : t === "pro" ? "Pro" : t ? t.toUpperCase() : "-";

  const cards = buildPricingCards();
  const freeCard = cards.find((c) => c.tier === "Free")!;
  const nightTraderCard = cards.find((c) => c.tier === "Night Trader")!;
  const proCard = cards.find((c) => c.tier === "Pro")!;

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
        <div className="grid gap-4 md:grid-cols-3">
          {/* Kolom 1: Coba Gratis */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-bg-card p-5">
            <div className="space-y-3">
              <p className="font-semibold text-text-primary">{freeCard.tier}</p>
              <p className="text-sm text-text-secondary">
                {freeCard.description}
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {freeCard.price}
                <span className="text-xs font-normal text-text-tertiary"> {freeCard.period}</span>
              </p>
              <p className="text-xs text-text-secondary">
                Tanpa kartu kredit, gratis selamanya di web.
              </p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                {freeCard.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/stocks"
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
            >
              {freeCard.ctaLabel}
            </Link>
          </div>

          {/* Kolom 2: Night Trader — PILIHAN UTAMA */}
          <div className="relative flex flex-col justify-between space-y-3 rounded-xl border-2 border-accent bg-bg-card p-5">
            <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {nightTraderCard.badge ?? "Rekomendasi awal"}
            </span>
            <div className="space-y-3">
              <p className="font-semibold text-text-primary">{nightTraderCard.tier}</p>
              <p className="text-sm text-text-secondary">
                {nightTraderCard.description}
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {nightTraderCard.originalPrice && (
                  <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">
                    {nightTraderCard.originalPrice}
                  </span>
                )}
                {nightTraderCard.price}
                <span className="text-xs font-normal text-text-tertiary"> {nightTraderCard.period}</span>
              </p>
              <p className="text-xs text-text-secondary">
                Bulan berikutnya {nightTraderCard.originalPrice}/bulan. Kurang dari Rp1.000/hari — lebih murah dari parkir motor.
              </p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                {nightTraderCard.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            <div>
              <StockAiChip
                baseHref={nightTraderCard.ctaHref}
                chipKey="pricing_night_trader"
                engagement="cta_pricing_night_trader"
                className="group relative inline-flex min-h-10 w-full items-center justify-center overflow-hidden rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-accent/90 press-scale"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shine_1s] motion-reduce:group-hover:animate-none"
                />
                {nightTraderCard.ctaLabel}
              </StockAiChip>
              {nightTraderCard.paymentNote && (
                <p className="mt-2 text-center text-[11px] text-text-tertiary">
                  {nightTraderCard.paymentNote}
                </p>
              )}
            </div>
          </div>

          {/* Kolom 3: Pro */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-bg-card p-5">
            {proCard.badge && (
              <span className="inline-block self-start rounded-full bg-bg-hover px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                {proCard.badge}
              </span>
            )}
            <div className="space-y-3">
              <p className="font-semibold text-text-primary">{proCard.tier}</p>
              <p className="text-sm text-text-secondary">
                {proCard.description}
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {proCard.originalPrice && (
                  <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">
                    {proCard.originalPrice}
                  </span>
                )}
                {proCard.price}
                <span className="text-xs font-normal text-text-tertiary"> {proCard.period}</span>
              </p>
              <p className="text-xs text-text-secondary">Bulan berikutnya {proCard.originalPrice}/bulan.</p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                {proCard.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            <div>
              <StockAiChip
                baseHref={proCard.ctaHref}
                chipKey="pricing_pro"
                engagement="cta_pricing_pro"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent press-scale"
              >
                {proCard.ctaLabel}
              </StockAiChip>
              {proCard.paymentNote && (
                <p className="mt-2 text-center text-[11px] text-text-tertiary">
                  {proCard.paymentNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
