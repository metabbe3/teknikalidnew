import type { Metadata } from "next";
import {
  AgentMembershipProvider,
  AgentHeroCta,
  AgentConnectionCard,
  AgentComplainBox,
  AgentClosingCta,
} from "@/components/telegram/subscribe-cta";
import { PricingBox } from "@/components/telegram/pricing-box";

export const metadata: Metadata = {
  title: "Agent Teknikal.id — Temanmu berinvestasi",
  description:
    "Chart profesional, sinyal objektif, bebas pompom — dan analisismu tidak pernah hilang.",
};

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

export default function AgentPage() {
  return (
    <AgentMembershipProvider>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-10">
        {/* ============ SECTION 1: HERO ============ */}
        <section className="space-y-3">
          <p className="inline-block rounded-md border border-border bg-bg-card px-2.5 py-1 font-mono text-xs text-text-secondary">
            BOT TELEGRAM · @TeknikalidAgentBot
          </p>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Asisten Saham di Telegram untuk Cek Level Harga dan Pasang Alert
          </h1>
          <p className="text-base font-semibold text-accent">
            Temanmu berinvestasi.
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Chart profesional, sinyal objektif, bebas pompom — dan analisismu tidak pernah hilang.
            Ketik kode saham untuk lihat ringkasan support, resistance, dan volume, atau pasang
            pengingat otomatis saat harga menyentuh target Anda.
          </p>
          <AgentHeroCta />
          <p className="text-xs font-medium text-text-secondary">
            Gratis 3 tanya/hari · Night Trader Rp29rb/bln · Pro Rp79rb/bln
          </p>
          <p className="text-xs text-text-tertiary">
            Gratis 3 perintah pertama setelah akun terhubung. Tanpa kartu kredit.
          </p>
        </section>

        {/* ============ SECTION 2: PAKET & HARGA (y < 800, di atas Kenapa Pakai Bot) ============ */}
        <section id="paket" className="space-y-4 scroll-mt-24">
          <div>
            <h2 className="font-serif text-xl font-semibold text-text-primary">
              Pilih Paket Sesuai Kebutuhan Trading Anda
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Harga khusus bulan pertama untuk pengguna awal. Semua notifikasi dikirim 100% melalui Telegram.
            </p>
          </div>

          <PricingBox />

          <div className="rounded-lg border border-border bg-bg-card p-4 text-xs leading-relaxed text-text-secondary">
            <span className="font-medium text-text-primary">Janji Kami:</span> Tidak ada
            pemotongan saldo otomatis tanpa sepengetahuan Anda. Seluruh data di website
            teknikal.id tetap gratis selamanya walaupun Anda sedang tidak berlangganan bot.
          </div>
        </section>

        {/* ============ SECTION 3: KENAPA BOT KALAU WEB GRATIS + CONTOH CHAT ============ */}
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
          <ChatMockup />
        </section>

        {/* ============ SECTION 4: CARA MULAI 3 LANGKAH ============ */}
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
          <AgentConnectionCard />
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
                a: "Tidak. TeknikalAgent membaca data teknikal secara objektif, mulai dari posisi support, resistance, arah tren, hingga volume transaksi. Keputusan beli, jual, dan batasan risiko tetap sepenuhnya di tangan Anda.",
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
                a: "Langsung dari tempat kamu berada: di bot Telegram ketik /keluhan (atau 'mau komplain'), di web isi form 'Ada masalah?' di bawah halaman ini. Keduanya masuk ke satu tim yang sama dan dibalas maks 24 jam.",
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
          <AgentComplainBox />
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
          <AgentClosingCta />
        </section>

        <p className="text-center text-xs text-text-tertiary">
          Pembayaran diproses Midtrans. Bukan rekomendasi investasi; alat bantu riset dan edukasi.
        </p>
      </div>
    </AgentMembershipProvider>
  );
}
