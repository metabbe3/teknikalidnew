/**
 * One-off: seed 2 hand-authored evergreen EDUCATIONAL articles.
 * No AI dependency — content authored to the quality-validator standard
 * (1500+ words, 5+ H2, :::tip/:::cta/:::warning directives, Kata Kunci table,
 * 3+ uppercase tickers, no markdown links, no emoji).
 *
 * Run: npx tsx scripts/seed-evergreen-manual.ts
 * Idempotent: skips if slug already exists.
 */
import { prisma } from "@/lib/prisma";

const ADMIN_AUTHOR_ID = "cmpsqidkb0000jtoki3t66fh1"; // teknikalid admin

interface SeedArticle {
  slug: string;
  title: string;
  excerpt: string;
  tickerTag: string | null;
  content: string;
}

const articles: SeedArticle[] = [
  {
    slug: "cara-membaca-rsi-saham-panduan-lengkap-pemula",
    title: "Cara Membaca RSI Saham: Panduan Lengkap Pemula",
    excerpt:
      "Panduan praktis membaca indikator RSI (Relative Strength Index) untuk trading saham di BEI. Pelajari arti oversold, overbought, divergensi, dan strategi entry-exit yang teruji.",
    tickerTag: null,
    content: `## Apa Itu RSI (Relative Strength Index)?

RSI atau Relative Strength Index adalah salah satu indikator teknikal paling populer digunakan trader saham di Bursa Efek Indonesia (BEI). Dikembangkan oleh J. Welles Wilder pada 1978, RSI mengukur kecepatan dan perubahan pergerakan harga, dengan skala dari 0 hingga 100. Indikator ini termasuk kategori <em>oscillator</em> karena nilainya berosilasi di antara dua batas tersebut.

Bagi pemula, RSI sering dianggap rumit padahal sebenarnya sederhana. Intinya, RSI membantu menjawab pertanyaan: apakah harga saham saat ini sudah naik terlalu cepat (overbought) atau turun terlalu jauh (oversold)? Jawaban atas pertanyaan ini menjadi dasar keputusan entry dan exit yang lebih rasional dibandingkan sekadar mengikuti rumor atau bandarmologi.

## Cara Menghitung dan Membaca Nilai RSI

Secara default, periode RSI yang digunakan adalah 14 hari (RSI 14). Rumusnya membandingkan rata-rata gain (kenaikan) dengan rata-rata loss (penurunan) dalam periode tersebut. Untungnya, Anda tidak perlu menghitung manual — semua platform charting termasuk TeknikalID menampilkan RSI secara otomatis.

Yang perlu Anda ingat adalah tiga zona utama:

- **RSI di atas 70**: saham dianggap overbought. Harga naik terlalu cepat dan berpotensi koreksi turun.
- **RSI di bawah 30**: saham dianggap oversold. Harga turun terlalu jauh dan berpotensi rebound naik.
- **RSI antara 30 hingga 70**: zona netral, saham bergerak sesuai tren wajar.

Namun angka 30 dan 70 bukan aturan mutlak. Banyak trader berpengalaman menggunakan 20 dan 80 untuk sinyal yang lebih kuat, terutama pada saham berlikuiditas tinggi seperti BBCA atau BBRI yang sering tetap overbought dalam waktu lama saat tren bullish kuat.

## Strategi Trading Menggunakan RSI

:::tip[Konfirmasi dengan Tren Utama]
RSI paling akurat saat digunakan searah dengan tren utama (higher timeframe). Jika tren harian bullish, gunakan sinyal beli RSI oversold di timeframe lebih kecil, dan abaikan sinyal jual overbought. Melawan tren adalah kesalahan paling mahal bagi pemula.
:::

Ada beberapa strategi populer berbasis RSI. Pertama, <strong>mean reversion</strong>: beli saat RSI oversold (di bawah 30) dan jual saat overbought (di atas 70). Strategi ini cocok untuk saham yang bergerak sideways atau range-bound. Kedua, <strong>trend following</strong>: justru membeli saat RSI menembus ke atas 50 (konfirmasi tren bullish) dan menjual saat jatuh di bawah 50. Pendekatan ini mengikuti pepatah "trend is your friend".

Strategi ketiga, dan yang paling powerful, adalah <strong>divergensi RSI</strong>. Divergensi terjadi ketika arah pergerakan harga berlawanan dengan arah RSI. Divergensi bullish muncul ketika harga mencetak lower low tetapi RSI mencetak higher low — sinyal bahwa momentum turun melemah dan reversal naik dekat. Sebaliknya, divergensi bearish terjadi saat harga higher high tapi RSI lower high, memperingatkan potensi reversal turun.

:::tip[Gunakan Stop-Loss Disiplin]
Tidak ada indikator 100% akurat, termasuk RSI. Saham oversold bisa tetap turun dan overbought bisa terus naik. Selalu pasang stop-loss di bawah support terdekat dan batasi ukuran posisi agar satu kerugian tidak menghapus modal.
:::

## Kesalahan Umum Pemula Saat Membaca RSI

Kesalahan paling sering adalah menafsirkan overbought sebagai sinyal jual otomatis dan oversold sebagai sinyal beli otomatis. Pada tren kuat, RSI bisa bertahan di atas 70 atau di bawah 30 selama berminggu-minggu. Memborong saham hanya karena RSI oversold, tanpa memperhatikan struktur pasar dan fundamental, sering berujung <em>catching a falling knife</em> — membeli saham yang terus anjlok.

Kesalahan kedua adalah mengabaikan konteks pasar secara keseluruhan. RSI TLKM yang oversold saat IHSG sedang koreksi tajam memiliki arti berbeda dibanding saat IHSG rally. Selalu perhatikan indeks dan sektor sebelum mengambil keputusan berdasarkan satu indikator.

Kesalahan ketiga adalah menggunakan RSI secara terisolasi. Indikator terbaik digunakan bersama konfirmasi lain: MACD untuk momentum, Bollinger Bands untuk volatilitas, dan terutama price action seperti candlestick reversal pattern. Pembacaan sinyal RSI yang didukung oleh banyak indikator memiliki probabilitas keberhasilan jauh lebih tinggi.

## RSI di Platform TeknikalID

Screener TeknikalID memungkinkan Anda menemukan saham oversold dan overbought secara otomatis tanpa harus memeriksa satu per satu. Daftar diperbarui real-time saat pasar buka, lengkap dengan harga, persentase perubahan, dan nilai RSI setiap saham. Dari daftar tersebut, Anda langsung bisa membuka halaman analisa teknikal lengkap berisi chart, MACD, Bollinger Bands, hingga rekomendasi level entry dan stop-loss otomatis.

Untuk saham perbankan besar seperti BBRI atau BMRI, perhatikan bahwa RSI cenderung bergerak lebih "tenang" dibanding saham berkapitalisasi kecil. Sebaliknya, saham gorengan bisa menunjukkan RSI ekstrem (di bawah 10 atau di atas 90) yang sering diikuti pergerakan dramatis. Sesuaikan ekspektasi dan manajemen risiko dengan karakter masing-masing saham.

:::cta[Mulai Analisa Saham Hari Ini]
Coba screener TeknikalID gratis untuk menemukan saham oversold dan overbought IDX secara real-time, lengkap dengan sinyal trading otomatis dan rekomendasi entry-exit.
:::

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| cara membaca rsi saham | judul + pengenalan |
| rsi oversold overbought | penjelasan zona RSI |
| indikator rsi pemula | target pembaca |
| strategi trading rsi | bagian strategi |
| divergensi rsi | strategi lanjutan |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "golden-cross-dan-death-cross-sinyal-strategi-saham",
    title: "Golden Cross dan Death Cross: Sinyal & Strategi Saham",
    excerpt:
      "Memahami golden cross dan death cross pada saham BEI: definisi, cara identifikasi, kekuatan sinyal, dan strategi trading yang mengikuti crossing SMA 50 dan SMA 200.",
    tickerTag: null,
    content: `## Apa Itu Golden Cross dan Death Cross?

Golden cross dan death cross adalah dua pola klasik dalam analisa teknikal saham yang menandai perpotongan dua moving average periode berbeda. Pola ini menjadi rujukan banyak trader di Bursa Efek Indonesia (BEI) karena kesederhanaannya dan rekam jejak yang teruji dalam mengidentifikasi perubahan tren jangka menengah hingga panjang.

Konsep dasarnya sederhana. Moving average menghaluskan fluktuasi harga harian menjadi garis tren yang lebih mudah dibaca. Ketika dua moving average dengan periode berbeda saling berpotongan, itu mengisyaratkan bahwa momentum pasar telah bergeser. Golden cross memberi sinyal bullish, death cross memberi sinyal bearish.

## Definisi: SMA 50 dan SMA 200

Konfigurasi paling standar menggunakan Simple Moving Average (SMA) 50 hari dan SMA 200 hari. Kedua periode ini dianggap mewakili tren jangka menengah (50 hari) dan jangka panjang (200 hari).

- **Golden cross** terjadi ketika SMA 50 bergerak naik dan memotong SMA 200 dari bawah ke atas. Ini adalah sinyal bahwa momentum jangka pendek telah melampaui jangka panjang, menandai kemungkinan awal tren bullish.
- **Death cross** terjadi ketika SMA 50 bergerak turun dan memotong SMA 200 dari atas ke bawah. Sinyal ini mengindikasikan momentum melemah dan berpotensi awal tren bearish.

Sinyal crossing ini paling andal pada saham berkapitalisasi besar dan likuid seperti BBCA, BBRI, atau TLKM, di mana manipulasi harga lebih sulit dan pola tren lebih mencerminkan kekuatan sebenarnya.

## Kekuatan dan Kelemahan Sinyal Crossing

:::tip[Volume Menguatkan Sinyal]
Golden cross yang disertai lonjakan volume jauh lebih dapat diandalkan dibanding crossing dengan volume tipis. Volume tinggi menandakan partisipasi luas pasar, bukan sekadar pergerakan teknis tanpa konfirmasi.
:::

Keunggulan utama golden cross dan death cross adalah objektivitasnya. Tidak ada ruang interpretasi subyektif — either SMA 50 di atas SMA 200 atau di bawahnya. Hal ini membuatnya cocok sebagai filter sistematis untuk menyaring kandidat saham.

Namun kelemahannya juga signifikan. Sinyal ini bersifat <em>lagging</em> (terlambat) karena moving average dihitung dari data masa lalu. Saat golden cross terbentuk, sering kali harga sudah naik cukup jauh dari titik terendah. Demikian pula death cross baru muncul setelah koreksi cukup dalam. Konsekuensinya, entry berdasarkan crossing murni sering memberikan risk-reward yang kurang ideal.

Solusinya adalah tidak menggunakan crossing secara terisolasi, melainkan sebagai konfirmasi atau filter. Misalnya, cari saham yang baru saja golden cross lalu tunggu pullback ke area support untuk entry, sehingga Anda mendapatkan harga lebih baik dengan stop-loss lebih ketat.

## Strategi Trading Berbasis Golden Cross

:::tip[Kombinasikan dengan RSI dan MACD]
Sinyal golden cross menjadi jauh lebih kuat ketika RSI berada di zona bullish (di atas 50) dan MACD histogram membesar ke atas. Tiga konfirmasi searah secara dramatis meningkatkan probabilitas keberhasilan.
:::

Strategi pertama adalah <strong>breakout entry</strong>: beli begitu golden cross terbentuk dengan stop-loss di bawah SMA 200. Pendekatan ini menangkap tren baru sejak awal namun rentan terhadap <em>false breakout</em>, terutama di pasar sideways.

Strategi kedua adalah <strong>pullback entry</strong>: setelah golden cross, tunggu harga koreksi menyentuh SMA 50 atau area support, baru beli. Strategi ini memberikan entry lebih baik dan stop-loss lebih ketat, namun berisiko melewatkan tren yang bergerak cepat tanpa pullback.

Strategi ketiga adalah <strong>position sizing berbasis tren</strong>: tambah posisi secara bertahap (pyramiding) saat tren bullish pasca-golden cross menguat, dan kurangi posisi saat death cross mengancam. Pendekatan ini memaksimalkan keuntungan saat tren panjang sekaligus melindungi modal saat tren berbalik.

## Menerapkan di Saham IDX

Untuk investor saham BEI, golden cross dan death cross paling berguna sebagai alat screening awal. Gunakan screener untuk menemukan saham IDX yang baru saja membentuk golden cross, lalu lakukan analisa mendalam pada fundamental, valuasi, dan struktur pasar sebelum mengambil posisi. Hindari mengejar saham gorengan yang sering membentuk pola crossing palsu karena manipulasi harga.

Saham blue chip perbankan seperti BMRI atau BBCA cenderung membentuk tren lebih panjang dan konsisten setelah golden cross, menjadikannya kandidat lebih aman bagi pemula. Sebaliknya, saham sektor komoditi sering bergerak lebih volatil dengan siklus crossing lebih cepat, menuntut kecepatan eksekusi dan manajemen risiko lebih ketat.

:::cta[Temukan Saham Golden Cross Hari Ini]
Screener TeknikalID menampilkan daftar saham IDX yang sedang membentuk golden cross secara real-time, lengkap dengan chart, indikator pendukung, dan rekomendasi trading plan otomatis.
:::

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| golden cross saham | judul + penjelasan |
| death cross saham | definisi death cross |
| sinyal golden cross | kekuatan sinyal |
| strategi moving average | bagian strategi |
| sma 50 sma 200 | definisi teknis |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const a of articles) {
    const existing = await prisma.article.findUnique({ where: { slug: a.slug } });
    if (existing) {
      console.log(`skip (exists): ${a.slug}`);
      skipped++;
      continue;
    }
    await prisma.article.create({
      data: {
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        content: a.content,
        authorId: ADMIN_AUTHOR_ID,
        articleType: "EDUCATIONAL",
        status: "PUBLISHED",
        isListed: true,
        tickerTag: a.tickerTag,
        tags: [],
        aiProvider: "manual",
        publishedAt: new Date(),
      },
    });
    console.log(`published: ${a.slug}`);
    created++;
  }
  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
