import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { SignalLandingTemplate } from "@/components/seo/signal-landing-template";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saham Uptrend Hari Ini — Sinyal Supertrend Bullish BEI",
  description:
    "Daftar saham uptrend hari ini di Bursa Efek Indonesia dengan sinyal Supertrend Bullish aktif. Temukan saham yang bergerak dalam tren naik terkonfirmasi volatilitas ATR.",
  alternates: { canonical: "/saham-uptrend" },
  keywords: [
    "saham uptrend hari ini",
    "daftar saham uptrend bei",
    "saham supertrend bullish",
    "saham tren naik",
    "screener saham uptrend",
    "swing trading saham uptrend",
  ],
  openGraph: {
    title: "Saham Uptrend Hari Ini — Sinyal Supertrend Bullish BEI",
    description:
      "Daftar saham IDX dalam tren naik (Supertrend Bullish) hari ini beserta skor sinyal teknikal.",
    url: `${SITE_URL}/saham-uptrend`,
    images: [
      {
        url: `${SITE_URL}/api/og?title=Saham+Uptrend+Hari+Ini&type=berita`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function SahamUptrendPage() {
  return (
    <SignalLandingTemplate
      preset="supertrend_bullish"
      canonicalPath="/saham-uptrend"
      title="Saham Uptrend Hari Ini"
      schemaDescription="Daftar saham Bursa Efek Indonesia dengan sinyal Supertrend Bullish (tren naik aktif) hari ini."
      heroDescription="Saham BEI yang sedang berada dalam fase tren naik berdasarkan indikator Supertrend Bullish — harga bertahan di atas pita support dinamis berbasis volatilitas (ATR). Dihitung dari penutupan sesi terakhir BEI."
      educationalTitle="Bagaimana cara kerja indikator Supertrend dalam menyaring saham uptrend?"
      educationalBody={
        <>
          <p>
            Menemukan <strong>saham uptrend</strong> yang valid membutuhkan lebih dari sekadar melihat kenaikan harga satu hari. Indikator <strong>Supertrend</strong> dirancang khusus untuk memisahkan kebisingan fluktuasi harian dari arah tren utama dengan menggabungkan titik tengah harga (rata-rata High dan Low) serta ukuran volatilitas nyata melalui <em>Average True Range</em> (ATR). Ketika harga penutupan saham berhasil menembus ke atas garis batas atas volatilitasnya, Supertrend berbalik menjadi <strong>Bullish</strong> dan secara otomatis membentuk garis lantai (trailing support) di bawah harga yang ikut naik seiring penguatan tren.
          </p>
          <p>
            Keunggulan utama menyaring saham uptrend menggunakan Supertrend dibandingkan Moving Average biasa terletak pada adaptasi volatilitasnya. Pada saham BEI yang bergerak tenang, pita Supertrend menyempit sehingga cepat mendeteksi awal reli; sedangkan pada saham yang bergejolak lebar, pita melebar agar trader tidak mudah terlempar keluar dari posisi (whipsaw) hanya karena koreksi wajar harian. Selama harga penutupan harian bertahan di atas level Supertrend Bullish, struktur kenaikan jangka pendek hingga menengah dianggap tetap utuh. Gunakan garis Supertrend sebagai acuan <em>trailing stop</em> disiplin dan padukan dengan skor sinyal serta RSI agar tidak membeli di puncak kejenuhan beli (overbought).
          </p>
        </>
      }
      emptyText="Belum ada saham dengan sinyal Supertrend Bullish saat ini. Cek kembali setelah pembaruan sesi berikutnya."
      askAiQuestion="Saham uptrend apa yang paling potensial hari ini?"
      faqs={[
        {
          question: "Apa bedanya saham uptrend Supertrend dengan Moving Average biasa?",
          answer:
            "Moving Average (seperti SMA20 atau SMA50) hanya menghitung rata-rata harga penutupan masa lalu, sedangkan Supertrend memperhitungkan rentang volatilitas harian (Average True Range / ATR). Hasilnya, Supertrend memberikan garis support dinamis yang tidak pernah turun selama fase bullish berlangsung, sehingga sangat praktis dijadikan batas trailing stop.",
        },
        {
          question: "Kapan sinyal Supertrend Bullish dianggap berakhir atau batal?",
          answer:
            "Fase uptrend pada indikator Supertrend berakhir apabila harga penutupan harian (daily close) jatuh menembus ke bawah garis support Supertrend. Saat hal itu terjadi, status indikator berubah menjadi Bearish dan trader umumnya melakukan realisasi keuntungan (take profit) atau pembatasan risiko (cut loss).",
        },
      ]}
    />
  );
}
