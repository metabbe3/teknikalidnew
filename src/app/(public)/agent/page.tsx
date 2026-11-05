"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Membership = {
  chatBound: boolean;
  chatId: string | null;
  tier: string;
  status: string | null;
  periodEnd: string | null;
  turnsUsed: number;
  maxTurns: number;
  promoUsed: boolean;
};

const BOT_URL = "https://t.me/TeknikalidAgentBot";

export default function AgentPage() {
  const [mem, setMem] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [bindUrl, setBindUrl] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/membership");
      if (r.ok) setMem(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startBind = async () => {
    setMsg(null);
    const r = await fetch("/api/agent/bind", { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      setBindUrl(j.bindUrl);
    } else if (r.status === 401) {
      // belum register/login (owner 6 Nov: WAJIB register dulu agar email bisa
      // di-bind; setelah register balik sini, 1 klik langsung onboarding bot)
      window.location.href = "/auth/register?next=/agent&cta=bind";
      return;
    } else {
      setMsg("Gagal membuat token — coba login ulang.");
    }
  };

  const checkout = async (tier: "basic" | "pro") => {
    setPaying(true);
    setMsg(null);
    try {
      const r = await fetch("/api/agent/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, promo: !mem?.promoUsed }),
      });
      if (r.status === 401) {
        window.location.href = "/auth/register?next=/agent&cta=pay";
        return;
      }
      const j = await r.json();
      if (r.status === 409 && j.error === "BINDING_REQUIRED") {
        setMsg("Hubungkan Telegram dulu (langkah 1) — 10 detik, tanpa isi apa-apa.");
        return;
      }
      if (j.redirect_url) {
        window.location.href = j.redirect_url as string;
        return;
      }
      setMsg(j.message ?? "Checkout gagal — coba beberapa saat lagi.");
    } finally {
      setPaying(false);
    }
  };

  const tierName = (t: string | null | undefined) =>
    t === "basic" ? "Night Trader" : t === "pro" ? "Pro" : t ? t.toUpperCase() : "-";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TeknikalAgent — Asisten Saham di Telegram</h1>
        <p className="text-sm text-text-secondary mt-1">
          Semua chart dan angka di teknikal.id gratis. Agent ini buat kamu yang sibuk
          kerja siang: bot yang jagain harga, kirim rekap sore, dan bisa ditanya kapan
          saja.
        </p>
      </div>

      {/* Value prop — 3 bullet bahasa tongkrongan (anti AI-slop) */}
      <div className="rounded-xl border border-border bg-bg-card p-5 space-y-2 text-sm">
        <p className="font-semibold text-text-primary">Kenapa trader malam pakai agent ini?</p>
        <ul className="space-y-1.5 text-text-secondary">
          <li>
            <span className="text-text-primary font-medium">Rekap sore otomatis 19.00 WIB</span>{" "}
            khusus saham incaranmu — tidak perlu buka puluhan tab sepulang kerja.
          </li>
          <li>
            <span className="text-text-primary font-medium">Dicolek pas harga krusial</span> —
            masuk area beli (Entry) atau dekat batas rugi (Stop Loss), langsung notif Telegram.
          </li>
          <li>
            <span className="text-text-primary font-medium">Bisa ditanya kapan saja</span> —
            &quot;BBRI sama BMRI malam ini bagusan mana?&quot; dijawab bahasa manusia.
          </li>
        </ul>
      </div>

      {/* Step 1: bind Telegram — register dulu, lalu 1 klik langsung onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Aktifkan di Telegram (coba gratis 3x tanya)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-text-secondary">Memuat…</p>
          ) : mem?.chatBound ? (
            <div className="space-y-2">
              <p className="text-sm text-text-primary font-medium">
                Terhubung (chat {mem.chatId})
              </p>
              <a href={`${BOT_URL}?start=web_agentpage`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  Buka Bot di Telegram
                </Button>
              </a>
            </div>
          ) : bindUrl ? (
            <div className="space-y-2">
              <p className="text-sm">
                Satu klik: buka Telegram, tekan <b>Start</b> — akun langsung terikat dan
                onboarding bot langsung jalan.
              </p>
              <a href={bindUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">Buka Telegram &amp; Mulai</Button>
              </a>
              <p className="text-xs text-text-tertiary">
                Link berlaku 15 menit. Akun email kamu yang mengikat langganan Telegram-mu.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Butuh akun web (email) supaya langganan dan Telegram-mu nyambung —
                register sekali, setelah itu semua lewat Telegram.
              </p>
              <Button onClick={startBind} className="gap-2">
                Hubungkan Telegram — 1 Klik
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Langganan (kalau cocok)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mem?.status === "paid" ? (
            <div className="text-sm space-y-1">
              <p className="font-semibold">Paket aktif: {tierName(mem.tier)}</p>
              {mem.periodEnd && (
                <p className="text-text-secondary">
                  Aktif s/d {new Date(mem.periodEnd).toLocaleDateString("id-ID")}
                </p>
              )}
              <p className="text-text-secondary">
                Kuota bulan ini: {mem.turnsUsed}/{mem.maxTurns} turn
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <p className="font-semibold">Night Trader</p>
                  {mem?.promoUsed ? (
                    <p className="text-2xl font-bold">
                      Rp29.000
                      <span className="text-xs font-normal text-text-tertiary"> /bulan</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-bold">
                      <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">Rp29.000</span>
                      Rp14.900
                      <span className="text-xs font-normal text-text-tertiary"> /bulan pertama</span>
                    </p>
                  )}
                  <p className="text-xs text-text-tertiary">
                    150 turn/bulan · pantau 10 saham · alert 10
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Kurang dari Rp1.000/hari — lebih murah dari parkir motor.
                  </p>
                  <Button
                    onClick={() => checkout("basic")}
                    disabled={paying || !mem?.chatBound}
                    className="w-full"
                  >
                    {paying ? "Memproses…" : mem?.promoUsed ? "Langganan Night Trader" : "Ambil Bulan Pertama Rp14.900"}
                  </Button>
                </div>
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <p className="font-semibold">Pro</p>
                  {mem?.promoUsed ? (
                    <p className="text-2xl font-bold">
                      Rp79.000
                      <span className="text-xs font-normal text-text-tertiary"> /bulan</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-bold">
                      <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">Rp79.000</span>
                      Rp29.000
                      <span className="text-xs font-normal text-text-tertiary"> /bulan pertama</span>
                    </p>
                  )}
                  <p className="text-xs text-text-tertiary">
                    400 turn/bulan · pantau 25 saham · alert 25
                  </p>
                  <Button
                    onClick={() => checkout("pro")}
                    disabled={paying || !mem?.chatBound}
                    variant="outline"
                    className="w-full"
                  >
                    Langganan Pro
                  </Button>
                </div>
              </div>
              {!mem?.chatBound && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Hubungkan Telegram dulu (langkah 1) untuk membayar.
                </p>
              )}
              {msg && <p className="text-sm text-rose-600">{msg}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-bg-card p-4 text-xs text-text-secondary space-y-1">
        <p className="font-medium text-text-primary">Pertanyaan yang sering ditanya</p>
        <p>
          <span className="font-medium">Data web jadi berbayar?</span> Tidak. Chart, skor
          sinyal, Entry/TP/SL di teknikal.id tetap gratis selamanya. Yang berbayar hanya
          asisten Telegram-nya.
        </p>
        <p>
          <span className="font-medium">Kenapa harganya segelas kopi?</span> Karena target
          kami pemantau saham biasa yang butuh dikit bantuan, bukan institusi.
        </p>
        <p>
          <span className="font-medium">Bisa berhenti?</span> Bisa kapan saja, tanpa
          penalti. Pembayaran lewat Midtrans (QRIS/e-wallet).
        </p>
      </div>

      <p className="text-xs text-text-tertiary">
        Pembayaran diproses Midtrans. Bukan rekomendasi investasi; alat bantu riset dan
        edukasi.
      </p>
    </div>
  );
}
