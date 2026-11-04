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
      const j = await r.json();
      if (r.status === 409 && j.error === "BINDING_REQUIRED") {
        setMsg("Hubungkan akun Telegram dulu sebelum berlangganan.");
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 TeknikalAgent — AI Saham Pribadi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Konsultasi saham via Telegram: analisa, berita, rencana trading — 24/7.
        </p>
      </div>

      {/* Step 1: bind Telegram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Hubungkan Telegram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : mem?.chatBound ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              ✅ Terhubung (chat {mem.chatId})
            </p>
          ) : bindUrl ? (
            <div className="space-y-2">
              <p className="text-sm">
                Buka link ini di Telegram, tekan <b>Start</b> — akun langsung terikat:
              </p>
              <a href={bindUrl} className="text-sm text-blue-600 underline break-all">
                {bindUrl}
              </a>
              <p className="text-xs text-muted-foreground">Berlaku 15 menit.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Satu akun email = satu akun Telegram (anti penyalahgunaan).
              </p>
              <Button onClick={startBind} variant="outline" className="gap-2">
                ✈️ Hubungkan via Bot
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Langganan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mem?.status === "paid" ? (
            <div className="text-sm space-y-1">
              <p className="font-semibold">Paket aktif: {mem.tier?.toUpperCase()}</p>
              {mem.periodEnd && (
                <p className="text-muted-foreground">
                  Aktif s/d {new Date(mem.periodEnd).toLocaleDateString("id-ID")}
                </p>
              )}
              <p className="text-muted-foreground">
                Kuota bulan ini: {mem.turnsUsed}/{mem.maxTurns} turn
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-semibold">Basic</p>
                  <p className="text-2xl font-bold">
                    {mem?.promoUsed ? "Rp79.000" : "Rp7.900"}
                    <span className="text-xs font-normal text-muted-foreground"> /bulan pertama</span>
                  </p>
                  <p className="text-xs text-muted-foreground">150 turn/bulan · selanjutnya Rp79.000</p>
                  <Button
                    onClick={() => checkout("basic")}
                    disabled={paying || !mem?.chatBound}
                    className="w-full"
                  >
                    {paying ? "Memproses…" : mem?.promoUsed ? "Langganan Basic" : "🎁 Ambil Promo -90%"}
                  </Button>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-semibold">Pro</p>
                  <p className="text-2xl font-bold">
                    {mem?.promoUsed ? "Rp149.000" : "Rp14.900"}
                    <span className="text-xs font-normal text-muted-foreground"> /bulan pertama</span>
                  </p>
                  <p className="text-xs text-muted-foreground">600 turn/bulan · selanjutnya Rp149.000</p>
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

      <p className="text-xs text-muted-foreground">
        Pembayaran diproses Midtrans. Langganan perpanjang otomatis bulan berikutnya dengan harga
        normal — bisa dibatalkan kapan saja. Bukan rekomendasi investasi; edukasi saja.
      </p>
    </div>
  );
}
