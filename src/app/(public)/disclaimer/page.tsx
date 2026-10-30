import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Disclaimer platform analisa teknikal saham TeknikalID. Data bersifat informasi dan bukan rekomendasi investasi.",
  alternates: { canonical: "/disclaimer" },
};

export const revalidate = 86400;

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Bukan Nasihat Keuangan</h2>
        <p>
          TeknikalID menyediakan alat analisa teknikal dan data pasar hanya untuk tujuan informasi
          dan edukasi. Tidak ada bagian dari platform ini yang merupakan nasihat keuangan,
          investasi, pajak, atau hukum — dan bukan ajakan membeli, menjual, atau menahan efek
          (surat berharga) tertentu, sesuai prinsip Peraturan OJK tentang perlindungan investor.
          Keputusan investasi sepenuhnya tanggung jawab Anda masing-masing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Fitur Analisa &amp; Kecerdasan Buatan</h2>
        <p>
          Ringkasan AI, skor sinyal, level support/resistance, serta jawaban asisten AI dihasilkan
          secara otomatis dari data historis dan indikator matematis. Label seperti &ldquo;Bullish&rdquo;/
          &ldquo;Bearish&rdquo; murni agregasi data otomatis — bukan sinyal trading, bukan rekomendasi,
          dan bukan jaminan pergerakan harga di masa depan. Status kepatuhan syariah (DES/ISSI)
          yang belum tersinkron tidak disimpulkan oleh AI; silakan rujuk daftar resmi DES OJK /
          ISSI BEI.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Akurasi Data</h2>
        <p>
          Data harga dan volume bersumber dari penyedia data pihak ketiga dan dapat tertunda.
          Kami berupaya menyajikan data akurat, namun tidak memberikan jaminan atas
          kelengkapan, keandalan, atau ketepatan informasi. Data dapat mengandung kesalahan
          atau kelalaian.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Indikator Teknikal</h2>
        <p>
          Indikator teknikal (RSI, MACD, Bollinger Bands, SMA, EMA, dan lainnya) adalah perhitungan
          matematis atas data harga historis. Indikator tidak memprediksi pergerakan harga di masa
          depan dan seharusnya tidak dijadikan satu-satunya dasar keputusan investasi. Kinerja
          masa lalu tidak menjamin hasil di masa mendatang.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Batasan Tanggung Jawab</h2>
        <p>
          TeknikalID dan kontributornya tidak bertanggung jawab atas kerugian atau kerusakan yang
          timbul dari penggunaan informasi pada platform ini. Anda bertanggung jawab penuh atas
          keputusan investasi Anda dan disarankan berkonsultasi dengan penasihat keuangan resmi
          berizin OJK sebelum berinvestasi.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Data Pihak Ketiga</h2>
        <p>
          Data pasar disediakan oleh penyedia data pihak ketiga. TeknikalID tidak berafiliasi
          dengan Bursa Efek Indonesia (IDX) maupun penyedia data tersebut. Seluruh merek dagang
          dan nama perusahaan adalah milik pemegangnya masing-masing.
        </p>
      </section>
    </LegalPage>
  );
}
