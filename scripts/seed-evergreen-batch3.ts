/**
 * Batch 3: 4 more hand-authored evergreen EDUCATIONAL articles.
 * Topics: Volume, Stochastic, ADX, Candlestick patterns.
 * Authored to clear 1200 words from the start. Idempotent.
 * Run: DATABASE_URL=... npx tsx scripts/seed-evergreen-batch3.ts
 */
import { prisma } from "@/lib/prisma";
const ADMIN_AUTHOR_ID = "cmpsqidkb0000jtoki3t66fh1";

const articles: { slug: string; title: string; excerpt: string; content: string }[] = [
  {
    slug: "cara-membaca-volume-saham-dan-price-volume",
    title: "Cara Membaca Volume Saham: Price Volume Analysis",
    excerpt:
      "Panduan membaca volume perdagangan saham BEI: hubungan price-volume, accumulation distribution, volume spike, dan konfirmasi tren untuk keputisan trading yang lebih akurat.",
    content: `## Apa Itu Volume Saham?

Volume saham adalah jumlah saham yang diperdagangkan dalam periode tertentu, biasanya satu hari. Volume adalah salah satu indikator paling mendasar namun sering diremehkan oleh trader pemula di Bursa Efek Indonesia (BEI). Padahal, volume memberikan informasi yang tidak bisa diberikan indikator lain: seberapa besar partisipasi dan minat pasar terhadap suatu saham pada level harga tertentu.

Harga menunjukkan apa yang terjadi, volume menunjukkan seberapa kuat keyakinan pasar terhadap pergerakan tersebut. Breakout tanpa volume sering false breakout, sementara breakout disertai volume tinggi jauh lebih dapat diandalkan. Memahami volume adalah pondasi penting bagi setiap trader yang ingin meningkatkan akurasi analisa.

## Hubungan Price dan Volume

:::tip[Volume Mengonfirmasi Tren]
Tren yang sehat selalu disertai volume yang mendukung. Tren bullish sehat: harga naik dengan volume meningkat, koreksi dengan volume menurun. Tren bearish sehat: harga turun dengan volume meningkat, rebound dengan volume tipis. Penyimpangan dari pola ini adalah peringatan dini.
:::

Hubungan antara pergerakan harga (price) dan volume mengungkap banyak informasi tentang kesehatatan suatu tren. Empat kombinasi dasar yang harus dipahami:

- **Harga naik, volume naik**: tren bullish sehat. Pembeli besar aktif, minat pasar kuat. Ini konfirmasi terbaik bahwa kenaikan memiliki dukungan nyata.
- **Harga naik, volume turun**: kenaikan lemah, kekuatannya meragukan. Tren bullish tanpa dukungan pembeli besar sering tidak berkelanjutan — waspada potensi reversal.
- **Harga turun, volume naik**: tekanan jual kuat, tren bearish sehat. Seller dominan, harga kemungkinan terus turun.
- **Harga turun, volume turun**: penurunan kehilangan tenaga, potensi bottoming. Banyak seller sudah keluar, pembeli mulai berminat — sering mendahului reversal naik.

Membaca keempat kombinasi ini secara konsisten akan meningkatkan kualitas keputusan trading secara signifikan. Trader profesional selalu memverifikasi sinyal harga dengan volume sebelum commit modal.

## Volume Spike dan Breakout

<strong>Volume spike</strong> adalah lonjakan volume yang jauh di atas rata-rata. Spike sering muncul pada momen penting: breakout level kunci, rilis berita material, atau pembalikan arah. Spike pada breakout resistance menandakan partisipasi luas dan kemungkinan besar breakout valid.

Namun spike juga bisa terjadi pada climax — puncak atau dasar pasar. Spike volume ekstrem setelah tren panjang sering menandai capitulation, yaitu momen ketika partisipasi terbesar terjadi tepat sebelum tren berbalik. Karena itu, konteks penting: spike di awal tren adalah konfirmasi, spike di akhir tren bisa jadi peringatan reversal.

Untuk saham IDX, breakout resistance disertai volume minimal 2-3 kali rata-rata 20 hari dianggap valid. Breakout dengan volume di bawah rata-rata justru mencurigakan dan sering false breakout. Selalu jadikan volume sebagai filter utama dalam strategi breakout.

## Accumulation dan Distribution

Volume juga membantu mengidentifikasi fase <strong>accumulation</strong> (akumulasi oleh pemain besar) dan <strong>distribution</strong> (distribusi oleh pemain besar). Pada fase accumulation, harga relatif flat atau turun perlahan tetapi volume meningkat saat harga naik kecil dan menurun saat harga turun — tanda pembeli besar diam-diam mengumpulkan saham.

Sebaliknya, distribution ditandai harga naik perlahan atau flat tetapi volume meningkat saat harga turun kecil — pemain besar diam-diam menjual ke ritel yang tergoda rally. Mengenali fase ini sangat berharga karena accumulation sering mendahului rally besar, dan distribution mendahului koreksi.

Indikator seperti On-Balance Volume (OBV) dan Accumulation/Distribution Line membantu memvisualisasikan pola ini secara sistematis. Pecahan antara arah harga dan OBV adalah divergensi volume — sinyal kuat bahwa price action saat ini tidak mencerminkan aliran modal sebenarnya.

## Volume di Platform TeknikalID

Halaman saham TeknikalID menampilkan volume lengkap dengan histogram harga, memungkinkan Anda membaca hubungan price-volume secara visual untuk setiap saham IDX. Screener juga membantu mengidentifikasi saham dengan volume spike atau anomali volume yang relevan untuk keputusan trading.

Untuk saham blue chip seperti BBCA atau BBRI, volume cenderung lebih stabil dan mencerminkan partisipasi institusional yang konsisten. Saham gorengan sering menunjukkan volume sangat tidak menentu — lonjakan ekstrem diikuti kekosongan, yang mencerminkan manipulasi dan likuiditas rendah. Selalu perhatikan karakter volume saham sebelum menetapkan strategi.

:::cta[Analisa Volume Setiap Saham IDX]
Buka halaman saham apa pun di TeknikalID untuk melihat grafik volume, hubungan price-volume, dan sinyal trading otomatis untuk seluruh saham IDX secara real-time.
:::

## Kesalahan Umum Membaca Volume

Kesalahan terbesar adalah mengabaikan volume sepenuhnya dan hanya melihat harga. Banyak trader pemula entry berdasarkan breakout tanpa memverifikasi volume, lalu terjebak false breakout. Volume adalah konfirmasi paling andal dan harus selalu diperiksa.

Kesalahan kedua adalah menafsirkan volume tinggi sebagai sinyal beli otomatis. Volume tinggi hanya menunjukkan minat besar, bukan arah. Volume tinggi saat harga anjlok adalah sinyal bearish, bukan peluang beli. Konteks arah harga selalu utama.

Kesalahan ketiga adalah membandingkan volume saham berbeda secara langsung. Volume BBCA (likuiditas sangat tinggi) tidak bisa dibandingkan dengan volume saham kecil. Selalu bandingkan volume dengan rata-rata historis saham yang sama, bukan lintas saham.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| cara membaca volume saham | judul + pengenalan |
| price volume analysis | judul + target |
| volume spike breakout | bagian volume spike |
| accumulation distribution | bagian akumulasi |
| konfirmasi tren volume | hubungan price volume |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "stochastic-oscillator-cara-membaca-dan-strategi",
    title: "Stochastic Oscillator: Cara Membaca dan Strategi Saham",
    excerpt:
      "Panduan Stochastic Oscillator untuk trading saham BEI: komponen %K dan %D, zona overbought oversold, crossover, dan strategi trading yang mengikuti momentum.",
    content: `## Apa Itu Stochastic Oscillator?

Stochastic Oscillator adalah indikator momentum yang dikembangkan oleh George Lane pada 1950-an. Berbeda dengan RSI yang mengukur kecepatan perubahan harga, Stochastic mengukur posisi harga penutupan saat ini relatif terhadap rentang harga dalam periode tertentu. Indikator ini beroperasi pada asumsi bahwa saat tren naik, harga cenderung closed di dekat tertinggi, dan saat tren turun, closed di dekat terendah.

Bagi trader saham di Bursa Efek Indonesia (BEI), Stochastic menjadi pelengkap populer untuk RSI dan MACD. Sifatnya yang sensitif membuatnya cocok untuk timing entry-exit dalam pasar range-bound, meski memerlukan filtering untuk menghindari sinyal palsu di tren kuat.

## Komponen %K dan %D

Stochastic terdiri dari dua garis:

- **Garis %K** (garis utama): rumusnya membandingkan closing price dengan rentang tinggi-rendah selama periode tertentu (biasanya 14). Nilai berkisar 0-100.
- **Garis %D**: moving average 3 periode dari %K, lebih halus dan berfungsi sebagai garis sinyal.

Rumus %K secara sederhana: posisi closing saat ini diukur relatif terhadap jarak antara tertinggi dan terendah dalam 14 periode, lalu dikalikan 100. Jika harga closed di puncak rentang, %K mendekati 100. Jika di dasar rentang, %K mendekati 0.

Banyak platform menyediakan <strong>fast stochastic</strong> (%K mentah) dan <strong>slow stochastic</strong> (%K yang sudah dihaluskan). Slow stochastic lebih populer karena mengurangi sinyal palsu. Pemula disarankan memakai slow stochastic untuk meminimalkan noise.

## Zona Overbought dan Oversold

:::tip[Stochastic di Tren Kuat Bisa Macet di Ekstrem]
Pada tren sangat kuat, Stochastic bisa bertahan di overbought atau oversold berhari-hari. Jangan menjual hanya karena Stochastic overbought di tengah rally. Tunggu konfirmasi crossing atau divergensi sebelum bertindak.
:::

Sama seperti RSI, Stochastic memiliki zona ekstrem:

- **Di atas 80**: overbought, harga dekat puncak rentang — potensi koreksi turun.
- **Di bawah 20**: oversold, harga dekat dasar rentang — potensi rebound naik.

Namun demikian, zona overbought/oversold Stochastic bukan sinyal otomatis. Di tren kuat, Stochastic bisa bertahan di atas 80 atau di bawah 20 lama. Praktik terbaik adalah menunggu garis %K crossing kembali ke dalam zona (misalnya turun dari atas 80 ke bawah 80 untuk sinyal jual, naik dari bawah 20 ke atas 20 untuk sinyal beli).

## Sinyal Crossover Stochastic

Sinyal utama Stochastic adalah crossing antara %K dan %D:

- **Bullish crossover**: %K memotong %D dari bawah ke atas, terutama di zona oversold (di bawah 20). Sinyal beli yang kuat.
- **Bearish crossover**: %K memotong %D dari atas ke bawah, terutama di zona overbought (di atas 80). Sinyal jual yang kuat.

Crossover di zona ekstrem jauh lebih dapat diandalkan dibanding crossing di tengah (sekitar 50). Banyak trader hanya mengambil sinyal yang terjadi ketika Stochastic keluar dari zona overbought atau oversold, mengabaikan crossing di area netral.

## Divergensi Stochastic

Sama seperti RSI dan MACD, Stochastic menunjukkan divergensi yang mengisyaratkan potensi pembalikan. Divergensi bullish terjadi ketika harga mencetak lower low tetapi Stochastic mencetak higher low. Divergensi bearish saat harga higher high tetapi Stochastic lower high.

Divergensi Stochastic paling bermakna di zona ekstrem. Divergensi bullish di oversold atau divergensi bearish di overbought memiliki probabilitas reversal lebih tinggi dibanding divergensi di tengah range.

## Strategi Trading dengan Stochastic

Strategi populer adalah <strong>kombinasi Stochastic dengan tren</strong>. Gunakan moving average atau MACD untuk menentukan tren utama, lalu ambil sinyal Stochastic hanya searah tren. Dalam tren bullish, abaikan sinyal jual Stochastic dan ambil hanya sinyal beli dari zona oversold. Pendekatan ini secara dramatis meningkatkan akurasi.

Strategi kedua adalah <strong>Stochastic + RSI</strong>. Kedua indikator saling mengonfirmasi — sinyal beli ketika RSI oversold dan Stochastic juga oversold dengan bullish crossing memberikan setup berkualitas tinggi. Kombinasi dual-oscillator menyaring banyak sinyal palsu.

Strategi ketiga adalah <strong>trading range</strong>. Di pasar sideways, Stochastic sangat efektif karena harga berosilasi teratur antara support dan resistance. Beli di Stochastic oversold dekat support, jual di overbought dekat resistance.

## Stochastic untuk Saham IDX

Halaman saham TeknikalID menampilkan Stochastic lengkap dengan zona overbought/oversold untuk seluruh saham IDX. Untuk saham likuid seperti BBCA atau BBRI, Stochastic cenderung memberikan sinyal lebih halus dan andal. Untuk saham gorengan yang volatil, Stochastic cepat berosilasi dan menuntut filtering ketat.

Saham sektor perbankan seperti BMRI sering menunjukkan pola Stochastic yang teratur selama periode range, menjadikannya kandidat baik untuk strategi trading range. Sebaliknya, saham komoditi yang trend kuat kadang membuat Stochastic macet di ekstrem — selalu konfirmasi dengan struktur tren.

:::cta[Analisa Stochastic Setiap Saham IDX]
Halaman saham TeknikalID menampilkan Stochastic Oscillator lengkap dengan sinyal dan trading plan otomatis untuk seluruh saham IDX, membantu Anda mengidentifikasi timing entry-exit yang tepat.
:::

## Kesalahan Umum Menggunakan Stochastic

Kesalahan terbesar adalah menggunakan Stochastic di tren kuat tanpa filter. Sinyal jual di overbought saat rally besar akan membuat Anda keluar terlalu cepat dan kehilangan keuntungan. Selalu identifikasi arah tren utama sebelum mempercayai sinyal Stochastic.

Kesalahan kedua adalah overtrading — Stochastic sering menghasilkan banyak crossing, terutama fast stochastic, yang menggoda untuk trading berlebihan. Batasi hanya pada sinyal di zona ekstrem dengan konfirmasi tambahan.

Kesalahan ketiga adalah mengabaikan konteks price action. Stochastic adalah alat bantu, bukan oracle. Selalu padukan dengan level support/resistance dan pola candlestick untuk konfirmasi sebelum commit modal.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| stochastic oscillator saham | judul + pengenalan |
| cara membaca stochastic | target pembaca |
| overbought oversold stochastic | bagian zona |
| strategi trading stochastic | bagian strategi |
| divergensi stochastic | bagian divergensi |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "adx-indikator-cara-mengukur-kekuatan-tren-saham",
    title: "ADX: Cara Mengukur Kekuatan Tren Saham",
    excerpt:
      "Panduan ADX (Average Directional Index) untuk mengukur kekuatan tren saham BEI. Pelajari cara membaca ADX, +DI -DI, dan kapan pasar sedang tren atau sideways.",
    content: `## Apa Itu ADX?

ADX atau Average Directional Index adalah indikator teknikal yang dikembangkan oleh Welles Wilder (pencipta RSI juga). Berbeda dari kebanyakan indikator yang menunjukkan arah tren, ADX secara unik mengukur <strong>kekuatan tren</strong> tanpa memperhatikan arahnya. ADX tinggi berarti tren kuat (baik naik maupun turun), ADX rendah berarti pasar sideways atau lemah.

Bagi trader saham di Bursa Efek Indonesia (BEI), ADX sangat berharga karena salah satu keputusan paling penting adalah menentukan apakah pasar sedang tren atau konsolidasi. Strategi trend following bekerja saat ADX tinggi, strategi mean reversion bekerja saat ADX rendah. ADX membantu memilih pendekatan yang tepat.

## Tiga Komponen: ADX, +DI, dan -DI

Sistem Directional Movement memiliki tiga garis:

- **+DI (Positive Directional Indicator)**: mengukur kekuatan gerakan naik. Naik saat harga membuat higher high.
- **-DI (Negative Directional Indicator)**: mengukur kekuatan gerakan turun. Naik saat harga membuat lower low.
- **ADX**: rata-rata perbedaan antara +DI dan -DI, menunjukkan kekuatan tren keseluruhan tanpa memperhatikan arah.

Interaksi +DI dan -DI menunjukkan arah: jika +DI di atas -DI, momentum bullish dominan; jika -DI di atas +DI, momentum bearish dominan. Crossing antara +DI dan -DI dapat menjadi sinyal perubahan arah, terutama ketika ADX naik (mengonfirmasi tren baru yang kuat).

## Membaca Nilai ADX

:::tip[ADX Di Bawah 20 = Sideways]
ADX rendah (di bawah 20) menandakan pasar sideways atau tanpa tren jelas. Ini bukan waktu untuk strategi trend following — gunakan strategi mean reversion atau tunggu hingga ADX naik menunjukkan tren baru terbentuk.
:::

Nilai ADX berkisar 0-100, dengan interpretasi umum:

- **ADX di bawah 20**: tren lemah, pasar sideways. Strategi trend following tidak efektif.
- **ADX 20-25**: tren mulai terbentuk, transisi.
- **ADX 25-50**: tren kuat, strategi trend following bekerja baik.
- **ADX di atas 50**: tren sangat kuat, ekstrem. Berhati-hatilah karena tren sangat kuat sering mendekati puncak/klimaks.

Yang penting dipahami: ADX tidak menunjukkan arah, hanya kekuatan. ADX naik bisa berarti tren bullish menguat ATAU tren bearish menguat. Selalu padukan pembacaan ADX dengan posisi +DI dan -DI untuk mengetahui arah tren yang diukur kuatnya.

## Strategi Menggunakan ADX

Strategi paling populer berbasis ADX adalah <strong>filter tren untuk strategi lain</strong>. Misalnya, hanya ambil sinyal golden cross MACD ketika ADX di atas 25 (mengonfirmasi tren kuat). Filter ini secara dramatis mengurangi false signal di pasar sideways.

Strategi kedua adalah <strong>trading DI crossovers</strong>. Beli ketika +DI crossing di atas -DI (terutama jika ADX naik), jual ketika -DI crossing di atas +DI. Pendekatan ini paling efektif saat ADX di atas 20 yang menunjukkan tren mulai terbentuk.

Strategi ketiga adalah <strong>breakout filter</strong>. Breakout dari konsolidasi paling andal ketika disertai ADX yang naik tajam dari level rendah. Hal ini menunjukkan transisi dari sideways ke tren baru. Breakout tanpa kenaikan ADX sering false breakout.

## Mengidentifikasi Fase Pasar

ADX membantu trader mengidentifikasi fase pasar secara objektif:

- **Sideways/ Konsolidasi**: ADX rendah (di bawah 20), harga bergerak range. Gunakan strategi mean reversion, trading di support/resistance.
- **Tren awal**: ADX naik dari bawah 20 menembus ke atas 25, menandakan tren baru terbentuk. Sering momen peluang terbaik untuk trend following.
- **Tren matang**: ADX tinggi di atas 25 dan masih naik. Tren berjalan kuat, ikuti tren.
- **Tren melemah**: ADX mulai turun dari puncak. Tren kehilangan momentum, bersiap untuk konsolidasi atau reversal.

Mengenali fase ini membantu trader menyesuaikan strategi secara dinamis. Banyak kerugian terjadi karena trader memaksakan strategi trend following di pasar sideways, atau sebaliknya.

## ADX untuk Saham IDX

Halaman saham TeknikalID menampilkan ADX lengkap dengan +DI dan -DI untuk seluruh saham IDX, membantu Anda mengidentifikasi kapan saham sedang tren kuat (kandidat trend following) atau sideways (kandidat mean reversion). Informasi ini melengkapi indikator lain untuk keputusan trading yang lebih baik.

Untuk saham blue chip seperti BBCA, BBRI, atau TLKM, ADX cenderung lebih stabil dan mencerminan tren institusional. Saham gorengan sering menunjukkan ADX ekstrem yang cepat berubah karena volatilitas manipulatif — berhati-hatilah mengandalkan ADX pada saham tersebut.

:::cta[Analisa ADX Setiap Saham IDX]
Halaman saham TeknikalID menampilkan ADX, +DI, -DI, dan rekomendasi trading plan otomatis untuk seluruh saham IDX — membantu Anda tahu kapan market sedang tren atau sideways.
:::

## Kesalahan Umum Menggunakan ADX

Kesalahan terbesar adalah menganggap ADX sebagai indikator arah. Banyak pemula menjual ketika ADX tinggi, mengira itu berarti overbought. Padahal ADX tinggi hanya berarti tren kuat, tanpa memperhatikan arah. Selalu cek +DI dan -DI untuk arah.

Kesalahan kedua adalah entry terlalu lambat. ADX adalah indikator lagging — saat ADX sudah di atas 40, sebagian besar tren sudah berjalan. Entry pada ADX ekstrem memberikan risk-reward buruk. Lebih baik masuk saat ADX baru naik dari bawah 20 menembus 25.

Kesalahan ketiga adalah mengabaikan ADX rendah. Pasar menghabiskan banyak waktu sideways, dan strategi mean reversion di ADX rendah bisa sangat menguntungkan. Jangan memaksakan trend following ketika ADX jelas rendah.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| adx indikator saham | judul + pengenalan |
| kekuatan tren saham | judul + target |
| cara membaca adx | target pembaca |
| strategi trend following | bagian strategi |
| di indicator +di -di | komponen |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "pola-candlestick-saham-hammer-engulfing-doji",
    title: "Pola Candlestick Saham: Hammer, Engulfing, dan Doji",
    excerpt:
      "Panduan membaca pola candlestick untuk trading saham BEI: hammer, shooting star, bullish/bearish engulfing, doji, dan bagaimana menggunakannya untuk konfirmasi reversal.",
    content: `## Apa Itu Candlestick?

Candlestick adalah metode visualisasi pergerakan harga yang berasal dari Jepang abad ke-18, diperkenalkan ke dunia barat oleh Steve Nison. Setiap candle menunjukkan empat data harga dalam satu periode: pembukaan (open), penutupan (close), tertinggi (high), dan terendah (low). Bentuk visual ini membuat pola harga lebih mudah dibaca dibanding garis biasa.

Bagi trader saham di Bursa Efek Indonesia (BEI), candlestick adalah bahasa price action paling dasar. Memahami pola candlestick memberi trader kemampuan membaca psikologi pasar secara langsung — siapa yang dominan, pembeli atau penjual, dan seberapa kuat keyakinan mereka.

## Anatomi Candlestick

Setiap candle memiliki <strong>body</strong> (tubuh) dan <strong>wick/shadow</strong> (sumbu). Body adalah selisih antara open dan close. Wick atas menunjukkan rentang dari high ke body, wick bawah dari low ke body.

- **Candle bullish** (close di atas open): biasanya berwarna hijau atau putih. Body menggambarkan kekuatan pembeli.
- **Candle bearish** (close di bawah open): biasanya merah atau hitam. Body menggambarkan kekuatan seller.
- **Panjang body**: menunjukkan dominasi satu sisi. Body panjang = momentum kuat.
- **Panjang wick**: menunjukkan penolakan level. Wick panjang = harga ditolak kembali dari level ekstrem.

Membaca kombinasi body dan wick adalah inti dari analisa candlestick. Candle dengan body kecil dan wick panjang menunjukkan keraguan pasar, sementara candle body penuh tanpa wick menunjukkan dominasi tegas.

## Pola Reversal Bullish

:::tip[Konfirmasi adalah Kunci]
Pola candlestick reversal paling andal ketika muncul di level kunci (support/resistance) atau setelah tren panjang. Pola di tengah-tanpa-konteks sering false signal. Selalu tunggu candle konfirmasi berikutnya.
:::

Beberapa pola reversal bullish paling populer:

- **Hammer**: candle dengan body kecil di atas, wick bawah panjang (minimal 2x body). Muncul di akhir downtrend, menandakan penolakan level rendah. Versi inversnya (body kecil di bawah, wick atas panjang) disebut <strong>Inverted Hammer</strong>.
- **Bullish Engulfing**: candle bullish besar yang body-nya sepenuhnya menutupi body candle bearish sebelumnya. Sinyal kuat dominasi pembeli mengambil alih.
- **Piercing Line**: candle bullish yang open di bawah close candle bearish sebelumnya, lalu close di atas titik tengah body candle sebelumnya. Versi lebih lemah dari engulfing.
- **Morning Star**: formasi tiga candle — bearish besar, candle kecil (doji/spinning top) yang gap down, lalu bullish besar. Sinyal reversal bullish tiga-bar yang kuat.

## Pola Reversal Bearish

Pola reversal bearish adalah cermin dari bullish:

- **Shooting Star**: candle dengan body kecil di bawah, wick atas panjang. Muncul di akhir uptrend, menandakan penolakan level tinggi — seller masuk agresif.
- **Bearish Engulfing**: candle bearish besar menutupi body candle bullish sebelumnya. Sinyal dominasi seller.
- **Dark Cloud Cover**: candle bearish yang open di atas close candle bullish sebelumnya, lalu close di bawah titik tengah body candle sebelumnya.
- **Evening Star**: cermin Morning Star — bullish besar, candle kecil gap up, lalu bearish besar. Sinyal reversal bearish tiga-bar.

## Pola Netral dan Kelanjutan

Tidak semua pola menandakan reversal. Beberapa pola menunjukkan keraguan atau kelanjutan:

- **Doji**: candle dengan body sangat kecil (open hampir sama dengan close). Menunjukkan keraguan pasar, keseimbangan pembeli dan seller. Doji setelah tren panjang sering mendahului reversal, tetapi butuh konfirmasi.
- **Spinning Top**: candle dengan body kecil dan wick panjang di kedua sisi. Keraguan seperti doji tetapi dengan range lebih besar.
- **Marubozu**: candle body penuh tanpa wick (atau wick sangat kecil). Dominasi tegas satu sisi — bullish Marubozu menandakan pembeli kuat dari open ke close.

## Strategi Menggunakan Candlestick

Strategi paling efektif adalah <strong>candlestick di level kunci</strong>. Hammer di support kuat jauh lebih dapat diandalkan dibanding hammer di tengah tren tanpa konteks. Selalu padukan sinyal candlestick dengan support/resistance, Fibonacci, atau moving average untuk konteks.

Strategi kedua adalah <strong>menunggu konfirmasi</strong>. Setelah pola reversal muncul, tunggu candle berikutnya break high pola tersebut (untuk bullish) sebelum entry. Hal ini mengurangi false signal secara signifikan, meski dengan entry sedikit lebih buruk.

Strategi ketiga adalah <strong>kombinasi candlestick + indikator</strong>. Hammer di support dengan RSI oversold dan divergensi MACD memberikan setup reversal berkualitas sangat tinggi. Semakin banyak konfirmasi searah, semakin tinggi probabilitas.

## Candlestick untuk Saham IDX

Halaman saham TeknikalID menampilkan chart candlestick interaktif untuk seluruh saham IDX, memungkinkan Anda mempraktikkan analisa pola langsung. Untuk saham likuid besar seperti BBCA atau BBRI, pola candlestick cenderung lebih dapat diandalkan karena partisipasi pasar luas menciptakan price action yang lebih teratur.

Saham gorengan sering menunjukkan candle ekstrem (body penuh, gap besar) yang sulit diinterpretasi dengan pola standar karena pergerakannya driven manipulasi. Selalu gunakan manajemen risiko ketat dan ukuran posisi kecil pada saham dengan karakter candle tidak teratur.

:::cta[Praktikkan Analisa Candlestick]
Halaman saham TeknikalID menampilkan chart candlestick interaktif lengkap dengan indikator pendukung dan trading plan otomatis untuk seluruh saham IDX. Mulai praktikkan analisa price action hari ini.
:::

## Kesalahan Umum Membaca Candlestick

Kesalahan terbesar adalah menganggap setiap pola candlestick sebagai sinyal otomatis. Pola hammer di tengah sideways tanpa level kunci sering tidak berarti apa-apa. Konteks adalah segalanya — selalu pertimbangkan di mana pola muncul.

Kesalahan kedua adalah entry sebelum konfirmasi. Pola reversal baru menjadi valid setelah candle berikutnya mengonfirmasi. Entry prematur pada pola yang belum dikonfirmasi sering berakhir rugi.

Kesalahan ketiga adalah over-reliance pada satu pola. Candlestick adalah salah satu alat, bukan satu-satunya. Trader profesional memadukan candlestick dengan indikator, level, dan struktur pasar untuk gambaran lengkap.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| pola candlestick saham | judul + pengenalan |
| hammer engulfing doji | judul + pola |
| candlestick reversal bullish | bagian reversal |
| price action saham | pengenalan |
| analisa candlestick pemula | target pembaca |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
];

async function main() {
  let created = 0, skipped = 0;
  for (const a of articles) {
    const existing = await prisma.article.findUnique({ where: { slug: a.slug } });
    if (existing) { console.log(`skip: ${a.slug}`); skipped++; continue; }
    await prisma.article.create({
      data: { slug: a.slug, title: a.title, excerpt: a.excerpt, content: a.content,
        authorId: ADMIN_AUTHOR_ID, articleType: "EDUCATIONAL", status: "PUBLISHED",
        isListed: true, tickerTag: null, tags: [], aiProvider: "manual", publishedAt: new Date() },
    });
    console.log(`published: ${a.slug}`); created++;
  }
  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
