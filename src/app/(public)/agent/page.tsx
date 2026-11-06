"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Membership = {
  email?: string;
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

/* Mockup percakapan statis (HTML/CSS, bukan screenshot) — contoh jujur format balasan bot.
 * Angka BBRI ilustratif pola umum, bukan data live. */
function ChatMockup() {
  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden" aria-label="Contoh percakapan di TeknikalAgent">
      <p className="border-b border-border px-4 py-2.5 font-mono text-xs text-text-secondary">
        Contoh percakapan di @TeknikalidAgentBot
      </p>
      <div className="space-y-3 p-4">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-white">
            BBRI gimana buat besok?
          </p>
        </div>
        <div className="flex justify-start">
          <pre className="max-w-[90%] overflow-x-auto rounded-2xl rounded-bl-sm border border-border bg-bg px-3.5 py-2.5 font-mono text-xs leading-relaxed text-text-secondary">
{`BBRI · Penutupan Rp4.680 (+1,30%)
Tren pendek: Bertahan di atas MA20 (Rp4.610)

Area pantau:
· Support terdekat: Rp4.600 - Rp4.620
· Resistance terdekat: Rp4.750, lanjut Rp4.820

Volume harian 1,4x di atas rata-rata 20 hari.
Selama tidak tutup di bawah Rp4.600, peluang
uji Rp4.750 masih terbuka.`}
          </pre>
        </div>
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-white">
            alert BBRI 4620
          </p>
        </div>
        <div className="flex justify-start">
          <pre className="max-w-[90%] overflow-x-auto rounded-2xl rounded-bl-sm border border-border bg-bg px-3.5 py-2.5 font-mono text-xs leading-relaxed text-text-secondary">
{`Alert aktif: BBRI di Rp4.620 (1/10 alert).
Bot akan kirim pesan ke Telegram ini saat
harga menyentuh Rp4.620.`}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* SATU PINTU KELUHAN (owner 6 Nov "biar gak bingung complain dimana"):
 * form kecil di halaman agent → /api/agent/complain → tabel sama dgn /keluhan bot.
 */
function ComplainBox({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [emailTouched, setEmailTouched] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!emailTouched && defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail, emailTouched]);

  const submit = async () => {
    if (text.trim().length < 5) return;
    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      const r = await fetch("/api/agent/complain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
        }),
      });
      if (r.ok) { setSent(true); setText(""); }
    } finally { setBusy(false); }
  };
  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
        ✅ Keluhanmu tercatat. Kami balas via email/chat Telegram terikat maks 24 jam.
        <button className="ml-2 underline hover:text-accent" onClick={() => setSent(false)}>
          kirim lagi
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <p className="text-sm font-medium text-text-primary">Ada masalah? Sampaikan di sini</p>
      <p className="mt-1 text-xs text-text-tertiary">
        Masalah pembayaran, jawaban bot, apa pun — langsung ke tim, tanpa bingung harus ke mana.
        (Di bot Telegram juga bisa: ketik <code>/keluhan</code>)
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmailTouched(true);
          setEmail(e.target.value);
        }}
        maxLength={160}
        placeholder="Email untuk balasan (opsional)…"
        className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Tulis keluhanmu…"
        className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={submit} disabled={busy || text.trim().length < 5}>
          {busy ? "Mengirim…" : "Kirim keluhan"}
        </Button>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [mem, setMem] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [bindUrl, setBindUrl] = useState<string | null>(null);
  const [payingTier, setPayingTier] = useState<"basic" | "pro" | null>(null);
  const paying = payingTier !== null;
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
    setPayingTier(tier);
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
        setMsg("Hubungkan Telegram dulu (langkah 2 di atas) — 10 detik, tanpa isi apa-apa.");
        return;
      }
      if (j.redirect_url) {
        window.location.href = j.redirect_url as string;
        return;
      }
      setMsg(j.message ?? "Checkout gagal — coba beberapa saat lagi.");
    } finally {
      setPayingTier(null);
    }
  };

  const tierName = (t: string | null | undefined) =>
    t === "basic" ? "Night Trader" : t === "pro" ? "Pro" : t ? t.toUpperCase() : "-";

  const connected = !loading && mem?.chatBound;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-12">
      {/* ============ SECTION 1: HERO + MOCKUP CHAT ============ */}
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <p className="inline-block rounded-md border border-border bg-bg-card px-2.5 py-1 font-mono text-xs text-text-secondary">
            BOT TELEGRAM · @TeknikalidAgentBot
          </p>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Asisten Saham di Telegram untuk Cek Level Harga dan Pasang Alert
          </h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            Tidak perlu buka banyak tab saat jam bursa. Ketik kode saham untuk lihat
            ringkasan support, resistance, dan volume — atau pasang pengingat otomatis
            saat harga menyentuh target Anda.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {connected ? (
              <Button onClick={startBind} className="gap-2" size="lg">
                {bindUrl ? "Buka Telegram &amp; Mulai" : "Hubungkan Telegram — 1 Klik"}
              </Button>
            ) : bindUrl ? (
              <a href={bindUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2" size="lg">Buka Telegram &amp; Mulai</Button>
              </a>
            ) : (
              <Button onClick={startBind} className="gap-2" size="lg">
                Hubungkan Telegram — 1 Klik
              </Button>
            )}
            <a href="#paket">
              <Button variant="outline" size="lg">Lihat Paket Mulai Rp14.900</Button>
            </a>
          </div>
          <p className="text-xs text-text-tertiary">
            Gratis 3 perintah pertama setelah akun terhubung. Tanpa kartu kredit.
          </p>
        </div>
        <ChatMockup />
      </section>

      {/* ============ SECTION 2: KENAPA BOT KALAU WEB GRATIS ============ */}
      <section className="space-y-5">
        <div>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            Kenapa Pakai Bot Kalau Data Web Sudah Gratis?
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Data grafik dan tabel di teknikal.id tetap terbuka gratis selamanya.
            TeknikalAgent membantu Anda yang tidak sempat memantau layar sepanjang jam bursa.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 rounded-xl border border-border bg-bg-card p-5">
            <p className="font-semibold text-text-primary">Cek Level Penting dalam Hitungan Detik</p>
            <p className="text-sm leading-relaxed text-text-secondary">
              Pulang kerja tidak perlu buka grafik satu per satu. Ketik kode saham di
              Telegram, langsung dapat posisi harga terhadap support, resistance, dan
              kondisi volume terakhir.
            </p>
            <p className="font-mono text-xs text-text-tertiary">Contoh ketik: &quot;BBCA&quot; atau &quot;cek support BMRI&quot;</p>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-bg-card p-5">
            <p className="font-semibold text-text-primary">Jaga Harga Saat Anda Sibuk Bekerja</p>
            <p className="text-sm leading-relaxed text-text-secondary">
              Pasang batas harga beli di area support atau batas jual untuk jaga modal.
              Begitu harga pasar menyentuh angka tersebut, Telegram Anda langsung memberi kabar.
            </p>
            <p className="font-mono text-xs text-text-tertiary">Contoh ketik: &quot;alert BREN 7200&quot;</p>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-bg-card p-5">
            <p className="font-semibold text-text-primary">Pantau Watchlist Tanpa Pindah Aplikasi</p>
            <p className="text-sm leading-relaxed text-text-secondary">
              Simpan daftar saham incaran Anda di dalam bot. Saat terhubung dari halaman
              saham web, saham yang Anda lihat otomatis masuk ke sapaan awal bot.
            </p>
            <p className="font-mono text-xs text-text-tertiary">Contoh ketik: &quot;lihat watchlist&quot;</p>
          </div>
        </div>
      </section>

      {/* ============ SECTION 3: CARA MULAI 3 LANGKAH ============ */}
      <section className="space-y-5">
        <h2 className="font-serif text-xl font-semibold text-text-primary">Cara Mulai dalam 30 Detik</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-card p-5">
            <p className="font-mono text-xs text-text-tertiary">LANGKAH 1</p>
            <p className="mt-1 font-semibold text-text-primary">Buat Akun teknikal.id</p>
            <p className="mt-1 text-sm text-text-secondary">
              Daftar gratis dengan email agar kuota chat, watchlist, dan alert Anda tersimpan aman.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-card p-5">
            <p className="font-mono text-xs text-text-tertiary">LANGKAH 2</p>
            <p className="mt-1 font-semibold text-text-primary">Hubungkan Telegram (1 Klik)</p>
            <p className="mt-1 text-sm text-text-secondary">
              Tekan tombol penghubung di bawah. Aplikasi Telegram terbuka dan langsung tersambung otomatis.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-card p-5">
            <p className="font-mono text-xs text-text-tertiary">LANGKAH 3</p>
            <p className="mt-1 font-semibold text-text-primary">Pakai 3 Chat Gratis</p>
            <p className="mt-1 text-sm text-text-secondary">
              Tes langsung dengan menanyakan saham incaran Anda. Jika cocok, baru pilih paket bulanan.
            </p>
          </div>
        </div>

        {/* Kartu koneksi (state-aware) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {loading
                ? "Memuat status akun…"
                : mem?.chatBound
                  ? "Akun Telegram Anda sudah terhubung"
                  : bindUrl
                    ? "Langkah 2: Buka Telegram & Mulai"
                    : "Langkah 1: Masuk atau Daftar Akun Terlebih Dahulu"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-text-secondary">Memuat…</p>
            ) : mem?.chatBound ? (
              <div className="space-y-2">
                <p className="text-sm text-text-primary font-medium">
                  Terhubung (chat {mem.chatId}). Kuota tanya bisa dicek langsung dari bot.
                </p>
                <a href={`${BOT_URL}?start=web_agentpage`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">Buka Bot di Telegram</Button>
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
                  Daftar gratis dengan email — setelah itu kembali ke halaman ini dan
                  hubungkan Telegram dalam 1 klik.
                </p>
                <Button onClick={startBind} className="gap-2">
                  Daftar Akun Gratis / Hubungkan Telegram — 1 Klik
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============ SECTION 4: PAKET & HARGA ============ */}
      <section id="paket" className="space-y-5 scroll-mt-24">
        <div>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            Pilih Paket Sesuai Kebutuhan Trading Anda
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Harga khusus bulan pertama untuk pengguna awal. Semua notifikasi dikirim 100% melalui Telegram.
          </p>
        </div>

        {/* Bar coba gratis — jangkar Rp0 */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-text-primary">Paket Coba Gratis · Rp0</p>
          <p className="text-sm text-text-secondary sm:max-w-md">
            Dapat 3 perintah pertama gratis untuk mencoba respons bot sebelum berlangganan.
          </p>
          <a href="#paket" className="text-sm font-medium text-accent hover:underline">
            Hubungkan Telegram di Atas
          </a>
        </div>

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
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Night Trader — highlight */}
            <div className="relative space-y-3 rounded-xl border-2 border-accent bg-bg-card p-5">
              <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
                PILIHAN UTAMA
              </span>
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
                  <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">Rp29.000</span>
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
              <Button
                onClick={() => checkout("basic")}
                disabled={paying || !mem?.chatBound}
                className="w-full"
              >
                {payingTier === "basic"
                  ? "Memproses Night Trader…"
                  : mem?.promoUsed
                    ? "Langganan Night Trader"
                    : "Ambil Bulan Pertama Rp14.900"}
              </Button>
            </div>

            {/* Pro */}
            <div className="space-y-3 rounded-xl border border-border bg-bg-card p-5">
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
                  <span className="mr-1.5 text-base font-medium text-text-tertiary line-through">Rp79.000</span>
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
              <Button
                onClick={() => checkout("pro")}
                disabled={paying || !mem?.chatBound}
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

        {!mem?.chatBound && mem?.status !== "paid" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Hubungkan Telegram dulu (Langkah 2) untuk membayar.
          </p>
        )}
        {msg && <p className="text-sm text-rose-600">{msg}</p>}

        {/* Jaminan */}
        <div className="rounded-lg border border-border bg-bg-card p-4 text-xs leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">Janji Kami:</span> Tidak ada
          pemotongan saldo otomatis tanpa sepengetahuan Anda. Seluruh data di website
          teknikal.id tetap gratis selamanya walaupun Anda sedang tidak berlangganan bot.
        </div>
      </section>

      {/* ============ SECTION 5: FAQ ============ */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-text-primary">Pertanyaan Umum</h2>
        <div className="space-y-3">
          {[
            {
              q: "Apakah data di web teknikal.id akan dikunci atau dibuat berbayar?",
              a: "Tidak. Semua halaman saham, tabel pasar, dan indikator di web teknikal.id gratis selamanya dan tidak pernah di-blur. Anda berlangganan TeknikalAgent murni untuk kepraktisan tanya-jawab dan pengingat harga otomatis di Telegram.",
            },
            {
              q: "Apakah bot ini memberikan sinyal beli pasti naik?",
              a: "Tidak. TeknikalAgent membaca data teknikal secara objektif — posisi support, resistance, arah tren, hingga volume transaksi. Keputusan beli, jual, dan batasan risiko tetap sepenuhnya di tangan Anda.",
            },
            {
              q: "Bagaimana perhitungan kuota tanya bulanan?",
              a: "Setiap satu pesan perintah atau pertanyaan yang Anda kirim ke bot dihitung sebagai 1 pemakaian kuota. Sisa kuota dapat dicek kapan saja langsung dari dalam bot.",
            },
            {
              q: "Apakah notifikasi dikirim lewat aplikasi selain Telegram?",
              a: "Tidak. Seluruh interaksi tanya-jawab dan notifikasi alert harga dikirim 100% melalui Telegram (@TeknikalidAgentBot) agar pengiriman pesan instan dan stabil.",
            },
            {
              q: "Apakah saya bisa mencoba dulu sebelum membayar?",
              a: "Bisa. Daftar akun gratis di web ini lalu klik Hubungkan Telegram. Anda langsung mendapat 3 kuota perintah gratis untuk menguji bot dengan saham pilihan Anda.",
            },
            {
              q: "Kalau ada masalah / keluhan, ke mana saya menghubungi?",
              a: "Langsung dari tempat kamu berada: di bot Telegram ketik /keluhan (atau 'mau komplain'), di web isi form 'Ada masalah?' di bawah halaman ini. Keduanya masuk ke satu tim yang sama — dibalas maks 24 jam.",
            },
            {
              q: "Bisa berhenti langganan kapan saja?",
              a: "Bisa, tanpa penalti. Pembayaran diproses Midtrans (QRIS/e-wallet).",
            },
          ].map((f) => (
            <details key={f.q} className="rounded-xl border border-border bg-bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-primary">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ SECTION 5b: SATU PINTU KELUHAN ============ */}
      <section className="space-y-3">
        <ComplainBox defaultEmail={mem?.email ?? ""} />
      </section>

      {/* ============ SECTION 6: CTA PENUTUP ============ */}
      <section className="space-y-4 rounded-xl border border-border bg-bg-card p-6 text-center">
        <h2 className="font-serif text-xl font-semibold text-text-primary">
          Coba Tanyakan Saham Incaran Anda Sekarang
        </h2>
        <p className="text-sm text-text-secondary">
          Mulai dengan 3 chat pertama gratis di Telegram, atau langsung aktifkan paket
          Night Trader Rp14.900 untuk bulan pertama.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {connected || bindUrl ? (
            <a href={bindUrl ?? `${BOT_URL}?start=web_agentpage`} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2" size="lg">Hubungkan Telegram (1 Klik)</Button>
            </a>
          ) : (
            <Button onClick={startBind} className="gap-2" size="lg">
              Daftar &amp; Coba 3 Chat Gratis
            </Button>
          )}
          {mem?.status !== "paid" && (
            <Button onClick={() => checkout("basic")} variant="outline" size="lg" disabled={paying || !mem?.chatBound}>
              Ambil Night Trader Rp14.900
            </Button>
          )}
        </div>
      </section>

      <p className="text-center text-xs text-text-tertiary">
        Pembayaran diproses Midtrans. Bukan rekomendasi investasi; alat bantu riset dan edukasi.
      </p>
    </div>
  );
}
