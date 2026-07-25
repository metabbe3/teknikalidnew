/**
 * Expand batch-3 articles: append a substantial H2 section before "## Kata Kunci Terkait"
 * to clear the 1200-word gate. Run: npx tsx scripts/expand-evergreen-batch3.ts
 */
import { prisma } from "@/lib/prisma";

const insertions: { slug: string; section: string }[] = [
  {
    slug: "cara-membaca-volume-saham-dan-price-volume",
    section: `## Indikator Volume Turunan: OBV dan VWAP

Karena volume mentah kadang sulit dibaca konsisten, analis mengembangkan indikator turunan. <strong>On-Balance Volume (OBV)</strong> menjumlahkan volume hari naik dan mengurangi volume hari turun, menghasilkan garis kumulatif yang mengikuti aliran modal. OBV naik saat harga naik, turun saat harga turun. Divergensi antara OBV dan harga adalah sinyal kuat — bila harga naik tetapi OBV flat atau turun, rally tidak didukung akumulasi nyata dan rawan reversal.

<strong>VWAP</strong> (Volume Weighted Average Price) adalah rata-rata harga dibobotkan volume sepanjang hari, banyak dipakai day trader sebagai benchmark. Harga di atas VWAP menandakan pembeli dominan hari itu, di bawah VWAP menandakan seller dominan. VWAP juga berfungsi sebagai support/resistance dinamis intraday — banyak institusi mengeksekusi order besar dekat VWAP untuk meminimalkan market impact.

Indikator lain seperti <strong>Volume Profile</strong> menampilkan volume per level harga (bukan per waktu), mengungkap level dengan likuiditas tertinggi yang sering menjadi magnet harga. Menggabungkan beberapa alat volume memberi gambaran komprehensif tentang dinamika pasar yang tidak terlihat dari harga saja.

## Volume dan Likuiditas Saham

Karakter volume berbeda antar jenis saham. Saham blue chip berkapitalisasi besar seperti BBCA, BBRI, atau TLKM memiliki volume konsisten tinggi dengan spread sempit — ideal untuk trading ukuran berapapun tanpa khawatir likuiditas. Volume mereka mencerminkan partisipasi ratusan ribu investor institusi dan ritel.

Saham mid-cap memiliki volume moderat yang cukup untuk trading retail tetapi bisa tipis saat koreksi pasar. Saham kecil dan gorengan sering memiliki volume sangat tidak menentu — lonjakan ekstrem di satu sesi lalu nyaris kosong di sesi berikutnya. Karakter ini membuat volume spike pada saham gorengan kurang reliable sebagai indikator dibanding pada saham likuid.

Selalu sesuaikan strategi dengan likuiditas saham. Pada saham illiquid, hindari ukuran posisi besar karena exit bisa sulit saat dibutuhkan. Pada saham likuid, volume adalah konfirmasi andal untuk setiap setup trading.`,
  },
  {
    slug: "stochastic-oscillator-cara-membaca-dan-strategi",
    section: `## Menyesuaikan Parameter Stochastic

Parameter default Stochastic adalah periode 14 untuk %K dan smoothing 3 untuk %D. Setting ini bekerja baik untuk swing trading harian pada sebagian besar saham. Namun parameter dapat disesuaikan untuk gaya trading berbeda. Stochastic periode lebih pendek (5 atau 9) memberikan sinyal lebih cepat dan agresif, cocok untuk scalper dan day trader, dengan konsekuensi lebih banyak false signal.

Stochastic periode lebih panjang (21 atau 25) menghasilkan garis lebih halus dengan sinyal lebih lambat namun andal, cocok untuk swing trader yang ingin menghindari noise. Eksperimen dengan parameter pada saham spesifik sering mengungkap setting optimal untuk karakter pergerakan tertentu — tidak ada satu setting terbaik universal.

Selain parameter periode, level zona overbought/oversold juga dapat disesuaikan. Beberapa trader menggunakan 15/85 atau 10/90 untuk sinyal yang lebih ekstrem dan selektif, mengurangi jumlah sinyal namun meningkatkan kualitas. Pemilihan zona tergantung toleransi risiko dan frekuensi trading yang diinginkan.

## Stochastic RSI: Hibrida Dua Oscillator

<strong>Stochastic RSI</strong> adalah inovasi yang menerapkan formula Stochastic pada nilai RSI (bukan harga langsung). Hasilnya adalah oscillator yang lebih cepat dan lebih ekstrem dibanding RSI atau Stochastic standalone. Stochastic RSI cocok untuk trader yang ingin sinyal awal dan tidak keberatan dengan volatilitas sinyal lebih tinggi.

Karena sensitivitasnya, Stochastic RSI paling baik digunakan dengan filter ketat — hanya ambil sinyal searah dengan tren utama, atau konfirmasi dengan indikator lain. Banyak trader profesional memadukan Stochastic RSI untuk timing entry dengan moving average atau MACD untuk arah tren, mendapatkan kombinasi yang memanfaatkan kekuatan masing-masing indikator.

Untuk pemula, disarankan menguasai RSI dan Stochastic standar terlebih dahulu sebelum beralih ke varian seperti Stochastic RSI. Indikator yang lebih kompleks tidak otomatis lebih baik — pemahaman mendalam pada beberapa indikator dasar sering menghasilkan keputusan trading lebih baik dibanding setumpuk indikator advanced yang belum dipahami.`,
  },
  {
    slug: "adx-indikator-cara-mengukur-kekuatan-tren-saham",
    section: `## ADX dan Indikator Pelengkap

ADX paling powerful ketika dipadukan dengan indikator lain. Karena ADX hanya mengukur kekuatan tren tanpa arah, trader profesional jarang menggunakannya sendirian. Kombinasi populer adalah ADX dengan MACD — ADX mengonfirmasi kekuatan, MACD menunjukkan arah. Ambil sinyal MACD hanya ketika ADX di atas 25 untuk memastikan tren cukup kuat.

Kombinasi kedua adalah ADX dengan Parabolic SAR. Parabolic SAR memberi trailing stop dinamis yang mengikuti tren, dan paling efektif saat ADX tinggi (tren kuat). Saat ADX rendah (sideways), Parabolic SAR sering memberi sinyal palsu — kombinasi dengan ADX sebagai filter mengatasinya.

Indikator lain seperti <strong>Aroon</strong> juga mengukur kekuatan tren dan dapat melengkapi ADX. Aroon Up dan Aroon Down menunjukkan seberapa baru tertinggi/terendah dibuat, memberi perspektif berbeda tentang momentum. Menggabungkan ADX dan Aroon memberi konfirmasi ganda untuk identifikasi tren kuat.

## ADX Multi-Timeframe

Seperti indikator lain, ADX memberi hasil terbaik saat dianalisa multi-timeframe. ADX chart mingguan menunjukkan kekuatan tren jangka panjang, ADX chart harian untuk tren menengah, ADX chart 4-jam untuk swing jangka pendek. Konvergensi ADX di beberapa timeframe menciptakan kondisi tren tertinggi kualitasnya.

Misalnya, jika ADX mingguan dan harian sama-sama di atas 25 dan naik, trader memiliki keyakinan tinggi bahwa tren yang sedang berjalan kuat dan layak diikuti dengan possi besar. Sebaliknya, jika ADX mingguan kuat tetapi harian turun, itu bisa jadi koreksi dalam tren besar — mungkin kesempatan entry pada pullback.

Disiplin multi-timeframe membedakan trader amatir dari profesional. Amatir sering hanya melihat satu timeframe dan bingung saat sinyal bertentangan. Profesional selalu memetakan kondisi di beberapa level sebelum commit modal, menghindari jebakan sinyal konflik.

## Kapan ADX Menyesatkan

ADX dapat menyesatkan dalam beberapa kondisi. Pertama, saat terjadi <em>spike</em> harga singkat (berita material, gorengan), ADX bisa melonjak ekstrem tanpa menandakan tren berkelanjutan. Kedua, di pasar sangat sideways dengan false breakout berulang, ADX bisa memberi sinyal palsu karena fluktuasi +DI/-DI yang tidak bermakna. Selalu kontekstualisasikan pembacaan ADX dengan struktur pasar dan fundamental.`,
  },
  {
    slug: "pola-candlestick-saham-hammer-engulfing-doji",
    section: `## Pola Candlestick Lanjutan

Selain pola dasar, ada banyak pola lanjutan yang memberi sinyal berharga:

- **Harami** (pregnancy): candle kecil berada dalam range body candle besar sebelumnya. Harami bullish = candle bearish besar diikuti candle bullish kecil — momentum turun melemah. Harami bearish adalah kebalikannya.
- **Tweezer Top/Bottom**: dua candle dengan high (top) atau low (bottom) yang nyaris sama. Tweezer bottom di support = potensi reversal bullish; tweezer top di resistance = potensi reversal bearish.
- **Three White Soldiers / Three Black Crows**: tiga candle bullish/bearish berturut-turut dengan body penuuh dan close berurutan lebih tinggi/rendah. Sinyal kuat momentum berkelanjutan.
- **Abandoned Baby**: formasi langka dengan doji yang gap terpisah dari candle sebelum dan sesudahnya. Sinyal reversal kuat yang jarang muncul tetapi sangat reliable.

Mengenal lebih banyak pola memperkaya kosakata price action, tetapi ingat: kuantitas pola yang dikenali tidak sama dengan profitabilitas. Lebih baik mengenal sedikit pola tetapi menguasai konteksnya dalam-dalam, dibanding mengenal banyak pola tetapi setengah hati.

## Candlestick dan Timeframe

Pola candlestick berperilaku berbeda di setiap timeframe. Pola di chart mingguan membawa bobot jauh lebih besar dibanding pola di chart 5 menit, karena mencerminkan periode lebih panjang dan partisipasi lebih luas. Weekly bullish engulfing adalah sinyal jauh lebih kuat daripada 5-minute engulfing.

Untuk swing trading, fokus pada chart harian dan 4-jam. Untuk position trading, chart mingguan dan harian. Day trader memakai chart intraday (15 menit, 1 jam). Konsistensi timeframe penting — banyak trader bingung karena mencampur analisa multi-timeframe tanpa kerangka jelas.

Aturan praktis: gunakan timeframe besar untuk menentukan arah dan level kunci, timeframe lebih kecil untuk timing entry presisi. Misalnya, identifikasi support di chart harian, lalu cari hammer di chart 1 jam dekat support tersebut untuk entry berkualitas tinggi. Pendekatan multi-timeframe inilah yang membedakan pembaca candlestick amatir dari profesional.

## Kesalahan Lanjutan Membaca Candlestick

Selain kesalahan dasar, waspadai over-analisis. Beberapa trader melihat pola di setiap candle dan over-trade. Tidak setiap candle membentuk pola bermakna — terkadang candle hanyalah noise pasar. Fokus pada pola yang muncul di konteks yang tepat (level kunci, setelah tren panjang, dengan konfirmasi) jauh lebih menguntungkan daripada trading setiap formasi yang tampak mirip pola.`,
  },
];

async function main() {
  for (const ins of insertions) {
    const art = await prisma.article.findUnique({ where: { slug: ins.slug }, select: { content: true } });
    if (!art) { console.log(`missing: ${ins.slug}`); continue; }
    if (art.content.includes(ins.section.slice(10, 50))) { console.log(`already: ${ins.slug}`); continue; }
    const updated = art.content.replace("## Kata Kunci Terkait", `${ins.section}\n\n## Kata Kunci Terkait`);
    await prisma.article.update({ where: { slug: ins.slug }, data: { content: updated } });
    console.log(`expanded: ${ins.slug}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
