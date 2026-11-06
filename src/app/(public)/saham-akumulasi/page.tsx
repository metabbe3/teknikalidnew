import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { SignalLandingTemplate } from "@/components/seo/signal-landing-template";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saham Akumulasi Hari Ini — Volume Beli Dominan (OBV)",
  description:
    "Daftar saham akumulasi hari ini di Bursa Efek Indonesia berdasarkan indikator On-Balance Volume (OBV) meningkat. Pantau saham dengan arus volume beli dominan untuk swing trading.",
  alternates: { canonical: "/saham-akumulasi" },
  keywords: [
    "saham akumulasi hari ini",
    "daftar saham akumulasi",
    "saham obv naik",
    "akumulasi saham bandar",
    "volume beli saham bei",
    "screener saham akumulasi",
  ],
  openGraph: {
    title: "Saham Akumulasi Hari Ini — Volume Beli Dominan (OBV)",
    description:
      "Daftar saham BEI dengan indikasi akumulasi volume (On-Balance Volume meningkat) hari ini.",
    url: `${SITE_URL}/saham-akumulasi`,
    images: [
      {
        url: `${SITE_URL}/api/og?title=Saham+Akumulasi+Hari+Ini&type=berita`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function SahamAkumulasiPage() {
  return (
    <SignalLandingTemplate
      preset="obv_accumulation"
      canonicalPath="/saham-akumulasi"
      title="Saham Akumulasi Hari Ini"
      schemaDescription="Daftar saham Bursa Efek Indonesia dengan tren On-Balance Volume (OBV) akumulasi hari ini."
      heroDescription="Saham BEI dengan tren On-Balance Volume (OBV) menanjak — indikasi volume transaksi pada hari harga naik lebih besar daripada hari harga turun. Dihitung dari data penutupan sesi terakhir BEI."
      educationalTitle="Apa itu saham fase akumulasi (OBV Accumulation) dan bagaimana membacanya?"
      educationalBody={
        <>
          <p>
            Dalam analisis teknikal, <strong>akumulasi</strong> menggambarkan kondisi ketika pelaku pasar berkapitalisasi besar secara bertahap menyerap likuiditas saham tanpa langsung memicu lonjakan harga yang ekstrem. Indikator <strong>On-Balance Volume (OBV)</strong> yang dikembangkan oleh Joseph Granville mengukur tekanan beli dan jual secara kumulatif dengan menambahkan volume pada hari penutupan hijau (naik) serta mengurangi volume pada hari penutupan merah (turun). Ketika kemiringan (slope) garis OBV bergerak naik secara konsisten selama beberapa sesi berturut-turut, sistem mengklasifikasikannya sebagai fase <em>Accumulation</em>.
          </p>
          <p>
            Mengapa fase akumulasi OBV krusial bagi trader ritel di Bursa Efek Indonesia? Pergerakan harga yang sehat selalu membutuhkan dukungan partisipasi volume. Saham yang bergerak mendatar (sideways) di dekat area support namun memiliki tren OBV yang terus menanjak sering kali menandakan adanya divergensi positif — pasokan saham di pasar sedang diserap sebelum terjadinya penembusan harga (breakout) ke atas. Sebaliknya, kenaikan harga tanpa kenaikan OBV rawan mengalami koreksi cepat (false breakout). Gunakan daftar saham akumulasi di bawah ini bersama konfirmasi skor sinyal gabungan, posisi harga terhadap MA20/MA50, serta aliran dana asing sebelum menyusun rencana entry dan batas cut loss.
          </p>
        </>
      }
      emptyText="Belum ada saham yang terdeteksi dalam fase akumulasi OBV saat ini. Cek kembali setelah pembaruan sesi berikutnya."
      askAiQuestion="Saham apa yang sedang akumulasi kuat hari ini?"
      faqs={[
        {
          question: "Apa arti indikator OBV Accumulation pada saham BEI?",
          answer:
            "OBV (On-Balance Volume) Accumulation berarti akumulasi volume pada hari-hari ketika harga saham ditutup naik lebih besar dibandingkan volume pada hari-hari ketika harga ditutup turun. Hal ini mengindikasikan minat beli yang lebih dominan dibanding tekanan jual dalam rentang pengamatan terakhir.",
        },
        {
          question: "Apakah saham dalam daftar akumulasi pasti langsung naik besok?",
          answer:
            "Tidak. Akumulasi OBV menunjukkan jejak aliran volume historis hingga penutupan sesi terakhir, bukan jaminan kenaikan instan keesokan hari. Fase akumulasi bisa berlangsung beberapa hari hingga beberapa minggu. Selalu kombinasikan dengan konfirmasi breakout resistance, RSI, serta manajemen risiko (stop loss).",
        },
      ]}
    />
  );
}
