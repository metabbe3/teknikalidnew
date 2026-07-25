/**
 * Expand batch-2 articles: insert a substantial new H2 section before
 * "## Kata Kunci Terkait" to clear the 1200-word gate. Also adds a missing
 * :::cta to the PER/PBV article. Run: npx tsx scripts/expand-evergreen-batch2.ts
 */
import { prisma } from "@/lib/prisma";

const insertions: { slug: string; section: string }[] = [
  {
    slug: "cara-membaca-macd-saham-panduan-trader-pemula",
    section: `## Menyesuaikan Parameter MACD

Setting default MACD (12, 26, 9) cocok untuk swing trading harian, tetapi dapat disesuaikan dengan gaya trading. Untuk day trading, parameter lebih cepat seperti (5, 35, 5) memberikan sinyal lebih responsif terhadap pergerakan intraday, meski dengan risiko sinyal palsu lebih tinggi. Untuk position trading jangka panjang, parameter lebih lambat seperti (19, 39, 9) menghasilkan sinyal lebih halus dan andal.

Eksperimen parameter harus didukung backtesting pada data historis. Tidak ada setting ajaib yang bekerja untuk semua saham dan kondisi pasar — yang penting adalah konsistensi. Setelah memilih parameter, disiplin menerapkannya dengan aturan entry-exit yang jelas, alih-alih terus mengubah setting mencari sinyal sempurna. Banyak trader profesional justru tetap menggunakan setting default karena kesederhanaannya, dan fokus pada manajemen risiko serta pemilihan saham ketimbang optimasi parameter berlebihan.

## MACD dan Price Action

Penggunaan MACD paling efektif bila dipadukan dengan price action manual. Misalnya, bullish crossover MACD menjadi jauh lebih kuat jika terjadi di dekat area support yang diuji berulang, atau jika disertai pola candlestick reversal seperti hammer atau bullish engulfing. MACD memberi konfirmasi momentum, price action memberi konteks struktur pasar.

Sebaliknya, sinyal MACD yang bertentangan dengan struktur price action jelas harus dihindari. Bullish crossover di tengah downtrend tajam dengan harga di bawah semua moving average mayor sering hanya koreksi teknis singkat, bukan reversal. Selalu hierarki: struktur pasar lebih utama daripada sinyal indikator tunggal.`,
  },
  {
    slug: "cara-membaca-bollinger-bands-saham",
    section: `## Menyesuaikan Parameter Bollinger Bands

Parameter default Bollinger Bands adalah periode 20 dan deviasi 2. Setting ini cocok untuk trading swing harian di sebagian besar saham. Namun, trader dapat menyesuaikan untuk karakter berbeda. Periode lebih panjang seperti 50 memberikan band lebih halus yang menyaring noise, cocok untuk position trading. Deviasi lebih besar seperti 2.5 atau 3 menangkap hanya pergerakan ekstrem, mengurangi sinyal palsu namun juga menurunkan frekuensi sinyal.

Untuk saham volatil seperti saham gorengan, deviasi lebih besar (3) membantu menyaring sinyal agar tidak terlalu reaktif terhadap spike harga singkat. Untuk saham blue chip yang bergerak lebih halus seperti BBCA atau TLKM, deviasi standar 2 atau bahkan 1.5 sudah memadai karena volatilitasnya rendah. Selalu amati karakter historis saham sebelum menetapkan parameter.

## Menggabungkan Bollinger Bands dengan Struktur Pasar

Bollinger Bands paling bermanfaat saat dipadukan dengan analisa struktur pasar seperti support dan resistance. Squeeze yang terjadi tepat di area support kuat menciptakan setup beli berkualitas tinggi — konvergensi konsolidasi (squeeze) dengan level kunci historis. Breakout dari squeeze tersebut ke atas sering berlanjut dengan pergerakan signifikan.

Sebaliknya, harga yang menyentuh upper band tepat di resistance kuat memberikan konfirmasi ganda untuk area jual. Konvergensi sinyal Bollinger dengan level struktur pasar meningkatkan probabilitas keberhasilan secara dramatis dibanding mengandalkan Bollinger Bands sendirian. Pendekatan multi-konfirmasi inilah yang membedakan trader pemula dari trader berpengalaman.`,
  },
  {
    slug: "per-dan-pbv-cara-membaca-valuasi-saham",
    section: `## Valuasi dan Pertumbuhan: PEG Ratio

PER sendiri tidak memperhitungkan pertumbuhan laba. PER 30x terlihat mahal, tetapi jika perusahaan tumbuh 40% per tahun, harga itu wajar. Untuk mengakomodasi pertumbuhan, investor menggunakan <strong>PEG Ratio</strong> (Price/Earnings to Growth) = PER dibagi tingkat pertumbuhan laba tahunan.

Aturan praktis: PEG di bawah 1 dianggap undervalued (murah relatif terhadap pertumbuhan), PEG di atas 1 dianggap mahal. PEG sangat berguna untuk menilai saham pertumbuhan di sektor seperti teknologi atau consumer goods yang PER-nya tinggi namun pertumbuhannya juga tinggi.

Bagi investor saham BEI, PEG membantu membandingkan saham dalam sektor pertumbuhan secara adil. Saham perbankan dengan PER rendah dan pertumbuhan moderat mungkin memiliki PEG menarik, sementara saham consumer dengan PER tinggi tetapi pertumbuhan cepat bisa juga PEG-nya menarik. Metrik ini melengkapi PER dan PBV untuk penilaian valuasi yang lebih holistik.

## Kapan Valuasi Tidak Relevan

PER dan PBV menjadi tidak bermakna dalam beberapa kondisi. Perusahaan dengan laba negatif (rugi) tidak memiliki PER yang valid — pembagian oleh EPS negatif menghasilkan angka tanpa arti. Untuk perusahaan dalam fase investasi besar seperti startup atau perusahaan ekspansi agresif, PER tinggi sementara dapat dimaklumi karena laba tertekan oleh investasi masa depan.

Saham siklikal seperti komoditi tambang dan sawit memiliki PER yang menyesatkan. Saat harga komoditi puncak, laba melonjak sehingga PER terlihat sangat rendah — justru itu sering puncak siklus dan tanda bahaya. Sebaliknya PER tinggi di dasar siklus justru bisa menjadi sinyal beli. Untuk saham siklikal, gunakan PER rata-rata 10 tahun (Shiller PE) daripada PER tahun berjalan.

:::cta[Analisa Saham IDX Lengkap]
Screener TeknikalID menyajikan sinyal teknikal untuk seluruh saham IDX, melengkapi analisa valuasi fundamental Anda. Kombinasikan keduanya untuk keputusan investasi terbaik — beli saham undervalued saat timing teknikalnya mendukung.
:::`,
  },
  {
    slug: "support-dan-resistance-saham-cara-menentukan",
    section: `## Support dan Resistance di Berbagai Timeframe

Level support dan resistance berbeda di setiap timeframe. Level di chart mingguan lebih kuat dan dihormati lebih lama daripada level di chart 5 menit. Trader profesional selalu memetakan level kunci di chart besar (mingguan atau harian) terlebih dahulu, lalu menggunakan chart lebih kecil untuk timing entry presisi.

Aturan praktis: semakin tinggi timeframe, semakin kuat levelnya. Support mingguan yang sudah diuji bertahun-tahun jauh lebih kuat daripada support harian yang baru terbentuk. Prioritaskan level dari timeframe besar untuk keputusan posisi besar. Untuk trader retail dengan posisi kecil, level harian biasanya memadai asalkan dikonfirmasi dengan indikator.

Konsistensi antar timeframe adalah kunci. Jika support harian dan support 4-jam berada di area yang sama (confluence), level tersebut sangat signifikan. Konvergensi level dari berbagai timeframe menciptakan zona kunci di mana pergerakan besar sering terjadi — baik reversal maupun breakout. Identifikasi confluence ini adalah keterampilan yang membedakan trader veteran dari pemula.

## Psychological Levels dan Round Numbers

Level psikologis atau angka bulat (round numbers) seperti Rp 1.000, Rp 5.000, atau Rp 10.000 sering menjadi support dan resistance yang kuat. Banyak trader dan investor menempatkan order beli atau jual di angka bulat, menciptakan akumulasi order yang memperkuat level tersebut. Level psikologis paling kuat pada saham dengan harga di angka bulat besar.

Saham yang harganya mendekati angka bulat besar (misalnya Rp 9.800 menuju Rp 10.000) sering mengalami perlawanan kuat di sana karena banyak seller take-profit dan buyer baru ragu. Sebaliknya, breakout di atas angka bulat besar sering diikuti pergerakan eksplosif karena order beli terpicu. Perhatikan level psikologis sebagai pelengkap level teknikal dalam analisa Anda.`,
  },
];

async function main() {
  for (const ins of insertions) {
    const art = await prisma.article.findUnique({ where: { slug: ins.slug }, select: { content: true } });
    if (!art) { console.log(`missing: ${ins.slug}`); continue; }
    if (art.content.includes(ins.section.slice(0, 40))) {
      console.log(`already expanded: ${ins.slug}`); continue;
    }
    const updated = art.content.replace("## Kata Kunci Terkait", `${ins.section}\n\n## Kata Kunci Terkait`);
    await prisma.article.update({ where: { slug: ins.slug }, data: { content: updated } });
    console.log(`expanded: ${ins.slug}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
