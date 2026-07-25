/**
 * Expand the 2 hand-authored evergreen articles to clear the 1200-word quality
 * gate (initial versions fell short at 768-825 words). Adds genuine sections.
 * Run: npx tsx scripts/expand-evergreen-manual.ts
 */
import { prisma } from "@/lib/prisma";

const updates: { slug: string; content: string }[] = [
  {
    slug: "cara-membaca-rsi-saham-panduan-lengkap-pemula",
    content: `## Apa Itu RSI (Relative Strength Index)?

RSI atau Relative Strength Index adalah salah satu indikator teknikal paling populer digunakan trader saham di Bursa Efek Indonesia (BEI). Dikembangkan oleh J. Welles Wilder pada 1978, RSI mengukur kecepatan dan perubahan pergerakan harga, dengan skala dari 0 hingga 100. Indikator ini termasuk kategori <em>oscillator</em> karena nilainya berosilasi di antara dua batas tersebut.

Bagi pemula, RSI sering dianggap rumit padahal sebenarnya sederhana. Intinya, RSI membantu menjawab pertanyaan: apakah harga saham saat ini sudah naik terlalu cepat (overbought) atau turun terlalu jauh (oversold)? Jawaban atas pertanyaan ini menjadi dasar keputusan entry dan exit yang lebih rasional dibandingkan sekadar mengikuti rumor atau bandarmologi.

RSI bekerja dengan logika momentum. Ketika harga naik, tekanan beli dianggap menguat; ketika harga turun, tekanan jual menguat. RSI memetakannya ke angka 0-100 sehingga trader bisa melihat secara objektif seberapa jenuh pergerakan terjadi. Inilah yang membuatnya begitu berguna terutama bagi trader pemula yang belum terbiasa membaca pola candlestick kompleks.

## Cara Menghitung dan Membaca Nilai RSI

Secara default, periode RSI yang digunakan adalah 14 hari (RSI 14). Rumusnya membandingkan rata-rata gain (kenaikan) dengan rata-rata loss (penurunan) dalam periode tersebut. Untungnya, Anda tidak perlu menghitung manual — semua platform charting termasuk TeknikalID menampilkan RSI secara otomatis.

Yang perlu Anda ingat adalah tiga zona utama:

- **RSI di atas 70**: saham dianggap overbought. Harga naik terlalu cepat dan berpotensi koreksi turun.
- **RSI di bawah 30**: saham dianggap oversold. Harga turun terlalu jauh dan berpotensi rebound naik.
- **RSI antara 30 hingga 70**: zona netral, saham bergerak sesuai tren wajar.

Namun angka 30 dan 70 bukan aturan mutlak. Banyak trader berpengalaman menggunakan 20 dan 80 untuk sinyal yang lebih kuat, terutama pada saham berlikuiditas tinggi seperti BBCA atau BBRI yang sering tetap overbought dalam waktu lama saat tren bullish kuat.

Zona 50 juga patut diperhatikan. Banyak trader menggunakan RSI 50 sebagai garis pembagi momentum: di atas 50 berarti momentum bullish mendominasi, di bawah 50 berarti momentum bearish. Perpotongan RSI dengan garis 50 sering dipakai sebagai konfirmasi perubahan tren jangka pendek, terutama bila disertai peningkatan volume.

## Memilih Periode RSI yang Tepat

Pemilihan periode RSI memengaruhi sensitivitas sinyal. RSI 14 adalah standar yang menyeimbangkan antara kecepatan sinyal dan akurasi, cocok untuk swing trading harian. RSI periode lebih pendek seperti 7 atau 9 memberikan sinyal lebih cepat namun juga lebih banyak sinyal palsu, cocok untuk day trader yang butuh reaksi cepat terhadap pergerakan intraday.

Sebaliknya, RSI periode lebih panjang seperti 21 atau 25 menghasilkan garis lebih halus dengan sinyal lebih lambat namun lebih andal, cocok untuk investor posisi yang ingin menghindari noise pasar harian. Tidak ada satu periode yang terbaik untuk semua kondisi; sesuaikan dengan gaya trading dan karakter saham yang dianalisis.

Untuk saham volatil seperti saham gorengan, periode lebih panjang membantu menyaring sinyal palsu. Untuk saham blue chip yang bergerak lebih halus seperti TLKM, periode lebih pendek bisa memberikan sinyal lebih awal sebelum tren benar-benar terbentuk. Eksperimen dengan periode berbeda pada saham yang sama sering mengungkap pola yang tidak terlihat dengan setting default.

## Strategi Trading Menggunakan RSI

:::tip[Konfirmasi dengan Tren Utama]
RSI paling akurat saat digunakan searah dengan tren utama (higher timeframe). Jika tren harian bullish, gunakan sinyal beli RSI oversold di timeframe lebih kecil, dan abaikan sinyal jual overbought. Melawan tren adalah kesalahan paling mahal bagi pemula.
:::

Ada beberapa strategi populer berbasis RSI. Pertama, <strong>mean reversion</strong>: beli saat RSI oversold (di bawah 30) dan jual saat overbought (di atas 70). Strategi ini cocok untuk saham yang bergerak sideways atau range-bound. Kedua, <strong>trend following</strong>: justru membeli saat RSI menembus ke atas 50 (konfirmasi tren bullish) dan menjual saat jatuh di bawah 50. Pendekatan ini mengikuti pepatah "trend is your friend".

Strategi ketiga, dan yang paling powerful, adalah <strong>divergensi RSI</strong>. Divergensi terjadi ketika arah pergerakan harga berlawanan dengan arah RSI. Divergensi bullish muncul ketika harga mencetak lower low tetapi RSI mencetak higher low — sinyal bahwa momentum turun melemah dan reversal naik dekat. Sebaliknya, divergensi bearish terjadi saat harga higher high tapi RSI lower high, memperingatkan potensi reversal turun.

Contoh konkret: bayangkan saham turun dari 5.000 ke 4.500 lalu ke 4.200 (lower low), namun RSI saat di 4.500 bernilai 25 dan saat di 4.200 bernilai 32 (higher low). Harga turun tapi RSI naik — divergensi bullish. Banyak trader berpengalaman menjadikan pola ini sebagai sinyal untuk bersiap beli, terutama bila divergensi muncul di area support kuat atau setelah koreksi panjang.

:::tip[Gunakan Stop-Loss Disiplin]
Tidak ada indikator 100% akurat, termasuk RSI. Saham oversold bisa tetap turun dan overbought bisa terus naik. Selalu pasang stop-loss di bawah support terdekat dan batasi ukuran posisi agar satu kerugian tidak menghapus modal.
:::

## Kombinasi RSI dengan Indikator Lain

RSI jarang berdiri sendiri di tangan trader profesional. Kombinasi paling umum adalah RSI dengan MACD. MACD mengonfirmasi arah tren melalui crossing garis signal dan histogram, sementara RSI menunjukkan kondisi overbought/oversold. Ketika RSI oversold dan MACD mulai crossing bullish, probabilitas reversal naik jauh lebih tinggi dibanding hanya mengandalkan salah satu.

Kombinasi kedua adalah RSI dengan Bollinger Bands. Saat harga menyentuh band bawah dan RSI oversold secara bersamaan, hal itu menandakan kondisi jenuh jual ekstrem yang sering diikuti rebound. Sebaliknya, harga di band atas dengan RSI overbought memperingatkan koreksi. Kombinasi ini sangat efektif untuk strategi mean reversion pada saham range-bound.

Indikator volume juga penting. Rebound dari kondisi oversold yang disertai lonjakan volume jauh lebih dapat diandalkan dibanding rebound dengan volume tipis. Volume tinggi menandakan partisipasi nyata pembeli besar, bukan sekadar pergerakan teknis. Selalu konfirmasi sinyal RSI dengan struktur volume untuk menghindari jebakan.

## Kesalahan Umum Pemula Saat Membaca RSI

Kesalahan paling sering adalah menafsirkan overbought sebagai sinyal jual otomatis dan oversold sebagai sinyal beli otomatis. Pada tren kuat, RSI bisa bertahan di atas 70 atau di bawah 30 selama berminggu-minggu. Memborong saham hanya karena RSI oversold, tanpa memperhatikan struktur pasar dan fundamental, sering berujung <em>catching a falling knife</em> — membeli saham yang terus anjlok.

Kesalahan kedua adalah mengabaikan konteks pasar secara keseluruhan. RSI sebuah saham yang oversold saat IHSG sedang koreksi tajam memiliki arti berbeda dibanding saat IHSG rally. Selalu perhatikan indeks dan sektor sebelum mengambil keputusan berdasarkan satu indikator.

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
| kombinasi rsi macd | bagian kombinasi indikator |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "golden-cross-dan-death-cross-sinyal-strategi-saham",
    content: `## Apa Itu Golden Cross dan Death Cross?

Golden cross dan death cross adalah dua pola klasik dalam analisa teknikal saham yang menandai perpotongan dua moving average periode berbeda. Pola ini menjadi rujukan banyak trader di Bursa Efek Indonesia (BEI) karena kesederhanaannya dan rekam jejak yang teruji dalam mengidentifikasi perubahan tren jangka menengah hingga panjang.

Konsep dasarnya sederhana. Moving average menghaluskan fluktuasi harga harian menjadi garis tren yang lebih mudah dibaca. Ketika dua moving average dengan periode berbeda saling berpotongan, itu mengisyaratkan bahwa momentum pasar telah bergeser. Golden cross memberi sinyal bullish, death cross memberi sinyal bearish.

Pola ini telah dipelajari selama dekade dan menjadi salah satu sinyal paling dikenal di dunia trading. Karena berbasis moving average yang sifatnya objektif dan terhitung matematis, golden cross dan death cross mengurangi unsur emosi dan spekulasi dalam pengambilan keputusan — sangat membantu terutama bagi trader pemula yang rentan tergoda rumor pasar.

## Definisi: SMA 50 dan SMA 200

Konfigurasi paling standar menggunakan Simple Moving Average (SMA) 50 hari dan SMA 200 hari. Kedua periode ini dianggap mewakili tren jangka menengah (50 hari) dan jangka panjang (200 hari).

- **Golden cross** terjadi ketika SMA 50 bergerak naik dan memotong SMA 200 dari bawah ke atas. Ini adalah sinyal bahwa momentum jangka pendek telah melampaui jangka panjang, menandai kemungkinan awal tren bullish.
- **Death cross** terjadi ketika SMA 50 bergerak turun dan memotong SMA 200 dari atas ke bawah. Sinyal ini mengindikasikan momentum melemah dan berpotensi awal tren bearish.

Sinyal crossing ini paling andal pada saham berkapitalisasi besar dan likuid seperti BBCA, BBRI, atau TLKM, di mana manipulasi harga lebih sulit dan pola tren lebih mencerminkan kekuatan sebenarnya. Pada saham likuid, ribuan investor institusi dan ritel berpartisipasi sehingga pola yang terbentuk mencerminkan konsensus pasar, bukan gerakan segelintir pemain.

SMA 200 sendiri memiliki makna khusus. Banyak analis menganggap harga di atas SMA 200 sebagai definisi tren bullish jangka panjang, dan di bawahnya sebagai bearish. Karena itu, perpotongan SMA 50 dengan SMA 200 selalu mendapat perhatian besar karena menandai pergeseran rezim tren.

## Kekuatan dan Kelemahan Sinyal Crossing

:::tip[Volume Menguatkan Sinyal]
Golden cross yang disertai lonjakan volume jauh lebih dapat diandalkan dibanding crossing dengan volume tipis. Volume tinggi menandakan partisipasi luas pasar, bukan sekadar pergerakan teknis tanpa konfirmasi.
:::

Keunggulan utama golden cross dan death cross adalah objektivitasnya. Tidak ada ruang interpretasi subyektif — SMA 50 berada di atas SMA 200 atau di bawahnya. Hal ini membuatnya cocok sebagai filter sistematis untuk menyaring kandidat saham dari ratusan saham IDX.

Namun kelemahannya juga signifikan. Sinyal ini bersifat <em>lagging</em> (terlambat) karena moving average dihitung dari data masa lalu. Saat golden cross terbentuk, sering kali harga sudah naik cukup jauh dari titik terendah. Demikian pula death cross baru muncul setelah koreksi cukup dalam. Konsekuensinya, entry berdasarkan crossing murni sering memberikan risk-reward yang kurang ideal.

Solusinya adalah tidak menggunakan crossing secara terisolasi, melainkan sebagai konfirmasi atau filter. Misalnya, cari saham yang baru saja golden cross lalu tunggu pullback ke area support untuk entry, sehingga Anda mendapatkan harga lebih baik dengan stop-loss lebih ketat. Pendekatan sabar seperti ini secara konsisten menghasilkan hasil lebih baik dibanding mengejar crossing begitu terbentuk.

## Menghindari Sinyal Palsu (False Cross)

Tidak semua golden cross berlanjut dengan tren bullish panjang. Beberapa ternyata <em>false cross</em> — crossing terjadi lalu harga justru berbalik arah, memojokkan trader yang masuk terlalu cepat. Untuk membedakannya, perhatikan beberapa faktor.

Pertama, <strong>kemiringan kedua moving average</strong>. Golden cross yang sehat biasanya disertai SMA 200 yang mulai mendatar atau naik, bukan turun tajam. Jika SMA 200 masih curam turun saat golden cross terbentuk, kemungkinan besar itu hanya bounce teknis dalam tren bearish besar.

Kedua, <strong>jarak antar kedua garis</strong>. Crossing dengan pergerakan SMA 50 yang melesat jauh dari SMA 200 lebih meyakinkan dibanding crossing yang nyaris sejajar. Jarak lebar menunjukkan momentum kuat, jarak sempit menunjukkan keraguan pasar.

Ketiga, <strong>konfirmasi candlestick</strong>. Tunggu closing harian yang meyakinkan di atas SMA 200 setelah crossing. Beberapa trader bahkan menunggu satu hingga dua minggu konfirmasi sebelum entry, menukar sedikit keuntungan awal dengan kepastian jauh lebih tinggi.

## Golden Cross di Berbagai Timeframe

Meski standarnya memakai chart harian, konsep golden cross dan death cross berlaku di semua timeframe. Pada chart mingguan, golden cross menandakan tren bullish jangka sangat panjang (multi-tahun) dengan sinyal jauh lebih lambat namun ekstrem andal. Pada chart intraday seperti 1 jam atau 4 jam, crossing memberi sinyal jangka pendek untuk day trader.

Penting untuk menyelaraskan timeframe dengan horizon investasi. Investor jangka panjang fokus pada golden cross mingguan atau harian, sementara swing trader memakai chart harian dan 4 jam. Mencampur timeframe tanpa strategi jelas sering membingungkan — misalnya masuk posisi besar karena golden cross di chart 1 jam padahal chart mingguan masih death cross.

Aturan praktis: gunakan timeframe lebih besar untuk menentukan arah tren utama, timeframe lebih kecil untuk timing entry. Jika chart mingguan dan harian sama-sama menunjukkan tren bullish, sinyal golden cross di chart 4 jam menjadi peluang entry berkualitas tinggi karena searah dengan tren mayor.

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
| false cross saham | bagian sinyal palsu |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
];

async function main() {
  for (const u of updates) {
    const r = await prisma.article.update({
      where: { slug: u.slug },
      data: { content: u.content, updatedAt: new Date() },
    });
    console.log(`expanded: ${r.slug}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
