import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { SignalLandingTemplate } from "@/components/seo/signal-landing-template";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saham di Atas MA200 Hari Ini — Tren Naik Jangka Panjang",
  description:
    "Daftar saham BEI yang diperdagangkan di atas garis Moving Average 200 hari (MA200 / SMA200) hari ini. Saringan utama investor institusi dan trend follower untuk tren naik jangka panjang.",
  alternates: { canonical: "/saham-di-atas-ma200" },
  keywords: [
    "saham di atas ma200",
    "saham diatas sma200 hari ini",
    "screener saham ma200",
    "saham tren naik jangka panjang",
    "moving average 200 saham bei",
    "saham bullish jangka panjang",
  ],
  openGraph: {
    title: "Saham di Atas MA200 Hari Ini — Tren Naik Jangka Panjang",
    description:
      "Daftar saham Bursa Efek Indonesia yang bertahan di atas garis SMA 200 hari (MA200) hari ini.",
    url: `${SITE_URL}/saham-di-atas-ma200`,
    images: [
      {
        url: `${SITE_URL}/api/og?title=Saham+di+Atas+MA200+Hari+Ini&type=berita`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function SahamDiAtasMa200Page() {
  return (
    <SignalLandingTemplate
      preset="above_sma200"
      canonicalPath="/saham-di-atas-ma200"
      title="Saham di Atas MA200 Hari Ini"
      schemaDescription="Daftar saham Bursa Efek Indonesia yang harga penutupannya berada di atas Simple Moving Average 200 hari (SMA200 / MA200) hari ini."
      heroDescription="Saham BEI dengan harga penutupan di atas Simple Moving Average 200 hari (MA200) — barometer standar institusi untuk memisahkan saham berstruktur bullish jangka panjang dari saham downtrend."
      educationalTitle="Mengapa garis MA200 (SMA 200 Hari) menjadi batas keramat investor institusi?"
      educationalBody={
        <>
          <p>
            <strong>Moving Average 200 hari (MA200 / SMA200)</strong> merepresentasikan rata-rata harga penutupan saham selama 200 hari bursa terakhir — setara dengan hampir satu tahun kalender perdagangan penuh di Bursa Efek Indonesia. Karena mencakup siklus empat kuartal laporan keuangan dan berbagai dinamika makroekonomi, garis MA200 dijadikan tolok ukur universal oleh manajer investasi, dana pensiun, serta <em>trend follower</em> profesional untuk menentukan rezim jangka panjang suatu emiten.
          </p>
          <p>
            Ketika sebuah saham diperdagangkan <strong>di atas MA200</strong>, rata-rata pembeli dalam satu tahun terakhir berada dalam posisi untung, sehingga tekanan jual akibat investor yang terjebak di harga pucuk (overhead supply) cenderung lebih ringan dibandingkan saham yang mendekam di bawah MA200. Banyak strategi <em>swing trading</em> disiplin menerapkan aturan ketat: hanya mengambil sinyal beli (seperti pullback ke MA20 atau oversold RSI) pada saham yang struktur besarnya sudah berada di atas MA200. Selain berfungsi sebagai filter tren sehat, garis MA200 itu sendiri kerap bertindak sebagai area support dinamis mayor saat terjadi koreksi pasar. Perhatikan pula jarak harga terhadap MA200 dan skor sinyal komposit di tabel bawah agar Anda dapat membedakan saham yang baru bangkit di atas MA200 dengan saham yang sudah terlampau jauh meninggalkannya.
          </p>
        </>
      }
      emptyText="Belum ada saham di atas MA200 yang terdeteksi saat ini. Cek kembali setelah pembaruan sesi berikutnya."
      askAiQuestion="Saham di atas MA200 mana yang sedang menarik untuk swing?"
      faqs={[
        {
          question: "Apa arti saham berada di atas garis MA200?",
          answer:
            "Saham yang berada di atas MA200 (Simple Moving Average 200 hari) berarti harga penutupan terbarunya lebih tinggi daripada rata-rata harga penutupan selama 200 hari perdagangan terakhir (±10 bulan bursa). Ini menandakan tren jangka panjang saham tersebut berada dalam zona positif (bullish).",
        },
        {
          question: "Bagaimana cara trading menggunakan daftar saham di atas MA200?",
          answer:
            "Investor dan swing trader umumnya menggunakan filter 'di atas MA200' sebagai saringan tahap pertama agar hanya memilih saham yang tren besarnya sehat. Setelah itu, titik beli (entry) dicari saat harga mengalami koreksi sehat (pullback) mendekati garis MA20, MA50, atau ketika indikator momentum seperti RSI dan MACD kembali berbalik menguat.",
        },
      ]}
    />
  );
}
