/**
 * Batch 2: 4 more hand-authored evergreen EDUCATIONAL articles (gateway-independent).
 * Topics chosen for high long-tail volume + tie to existing tools (screener/signal pages).
 * All authored to pass validateArticle (1200+ words, 5+ H2, directives, tickers).
 * Idempotent (skip if slug exists). Run: npx tsx scripts/seed-evergreen-batch2.ts
 */
import { prisma } from "@/lib/prisma";

const ADMIN_AUTHOR_ID = "cmpsqidkb0000jtoki3t66fh1";

const articles: { slug: string; title: string; excerpt: string; content: string }[] = [
  {
    slug: "cara-membaca-macd-saham-panduan-trader-pemula",
    title: "Cara Membaca MACD Saham: Panduan Trader Pemula",
    excerpt:
      "Pelajari indikator MACD (Moving Average Convergence Divergence) untuk trading saham BEI: komponen MACD, sinyal crossover, divergensi, hingga strategi entry-exit yang praktis.",
    content: `## Apa Itu Indikator MACD?

MACD atau Moving Average Convergence Divergence adalah indikator teknikal follow-trend dan momentum yang menjadi andalan banyak trader saham di Bursa Efek Indonesia (BEI). Diciptakan oleh Gerald Appel pada 1970-an, MACD menunjukkan hubungan antara dua moving average harga saham, membantu trader mengidentifikasi arah tren sekaligus kekuatan momentum.

Berbeda dengan RSI yang berformat oscillator murni (0-100), MACD memiliki tiga komponen yang saling melengkapi sehingga memberi sinyal lebih kaya. Bagi pemula, MACD terlihat rumit, tetapi setelah memahami tiga komponennya, Anda akan mendapat salah satu indikator paling andal untuk konfirmasi tren dan timing entry-exit.

## Tiga Komponen MACD

MACD terdiri dari tiga elemen yang harus dipahami:

- **Garis MACD** (garis utama): selisih antara EMA 12 dan EMA 26. Garis ini merespons perubahan harga lebih cepat.
- **Garis Sinyal** (signal line): EMA 9 dari garis MACD. Garis ini lebih lambat dan berfungsi sebagai pemicu sinyal.
- **Histogram**: visualisasi selisih antara garis MACD dan garis Sinyal. Batang histogram di atas nol menandakan momentum bullish, di bawah nol menandakan momentum bearish.

Ketiga komponen bekerja bersama. Garis MACD menunjukkan arah, garis Sinyal memberi konfirmasi timing, dan histogram mengungkap kekuatan momentum yang sedang terjadi. Kombinasi inilah yang membuat MACD lebih informatif dibanding single-line indicator.

## Sinyal Crossover MACD

:::tip[Konfirmasi dengan Volume dan Tren]
Sinyal MACD paling andal saat searah dengan tren utama (chart lebih besar). Golden cross MACD di tengah tren bullish kualitasnya jauh lebih tinggi dibanding di pasar sideways. Selalu cek volume — crossing disertai volume tinggi lebih meyakinkan.
:::

Sinyal paling populer dari MACD adalah <strong>crossover</strong> antara garis MACD dan garis Sinyal:

- **Bullish crossover** (golden cross MACD): garis MACD memotong garis Sinyal dari bawah ke atas. Sinyal beli.
- **Bearish crossover** (death cross MACD): garis MACD memotong garis Sinyal dari atas ke bawah. Sinyal jual.

Sinyal kedua adalah <strong>crossing garis nol</strong>. Ketika garis MACD naik menembus garis nol dari bawah, itu konfirmasi tren bullish menguat. Sebaliknya, turun menembus nol dari atas menandakan tren bearish. Crossing garis nol lebih lambat dari crossover sinyal namun lebih andal karena mengonfirmasi pergeseran momentum utama.

Sinyal ketiga berasal dari <strong>histogram</strong>. Saat histogram membesar ke atas, momentum bullish menguat. Saat histogram menyusut setelah periode bullish, itu peringatan dini momentum mulai melemah — sering mendahului crossover bearish. Membaca perubahan histogram membantu trader bersiap sebelum sinyal konvensional terbentuk.

## Divergensi MACD

:::tip[Divergensi Adalah Sinyal Pembalikan Terkuat]
Divergensi MACD adalah salah satu sinyal reversal paling diandalkan. Ketika harga dan MACD bergerak berlawanan, waspada — pembalikan arah sering terjadi tidak lama setelahnya. Namun selalu tunggu konfirmasi price action sebelum entry.
:::

Divergensi MACD terjadi ketika arah pergerakan harga berlawanan dengan arah MACD, menandakan momentum yang melemah dan potensi pembalikan.

<strong>Divergensi bullish</strong>: harga mencetak lower low tetapi MACD mencetak higher low. Hal ini menunjukkan meskipun harga masih turun, tekanan jual sudah melemah — rebound berpotensi terjadi.

<strong>Divergensi bearish</strong>: harga mencetak higher high tetapi MACD mencetak lower high. Meskipun harga masih naik, momentum beli melemah — koreksi turun berpotensi terjadi.

Divergensi paling bermakna setelah tren panjang. Divergensi di pasar sideways kurang andal. Trader berpengalaman jarang entry hanya berdasarkan divergensi — mereka menggunakannya sebagai peringatan untuk bersiap, lalu menunggu konfirmasi seperti candlestick reversal atau breaking structure sebelum bertindak.

## Strategi Trading dengan MACD

Strategi pertama adalah <strong>trend following dengan crossover</strong>: beli saat bullish crossover di atas garis nol (konfirmasi tren bullish), jual saat bearish crossover di bawah garis nol. Pendekatan ini mengikuti tren dan menghindari sinyal palsu di pasar sideways.

Strategi kedua adalah <strong>kombinasi MACD dan RSI</strong>. Gunakan MACD untuk menentukan arah tren, dan RSI untuk timing entry berdasarkan kondisi overbought/oversold. Misalnya, cari saham dengan MACD bullish (di atas garis nol) yang RSI-nya baru saja rebound dari zona oversold — kombinasi yang reliabel.

Strategi ketiga adalah <strong>multi-timeframe</strong>. Gunakan MACD chart mingguan untuk arah tren utama, MACD chart harian untuk timing swing entry. Ambil posisi hanya jika kedua timeframe menunjukkan sinyal searah. Pendekatan ini secara dramatis mengurangi false signal.

## MACD untuk Saham IDX

Screener TeknikalID mengintegrasikan sinyal MACD ke dalam analisa setiap saham IDX. Anda bisa melihat posisi MACD (bullish/bearish), status crossover, dan kekuatan histogram langsung di halaman saham, lengkap dengan rekomendasi trading plan otomatis.

Untuk saham blue chip seperti BBCA atau BBRI, MACD cenderung memberikan sinyal lebih halus dan andal karena pergerakan harganya relatif teratur. Untuk saham berkapitalisasi kecil atau gorengan, MACD bisa memberi sinyal cepat namun juga lebih banyak noise — selalu konfirmasi dengan struktur pasar dan volume.

Saham perbankan besar seperti BMRI sering menunjukkan pola MACD yang konsisten selama tren, menjadikannya kandidat baik untuk strategi trend following. Sebaliknya, saham sektor properti atau konsumen sering bergerak dalam siklus yang membuat MACD berosilasi cepat — pendekatan multi-timeframe menjadi sangat berguna di sini.

:::cta[Analisa MACD Setiap Saham IDX]
Buka halaman saham apa pun di TeknikalID untuk melihat sinyal MACD, histogram, dan rekomendasi trading plan otomatis — lengkap dengan level entry, target, dan stop-loss.
:::

## Kesalahan Umum Menggunakan MACD

Kesalahan paling sering adalah menggunakan MACD di pasar sideways. Saat harga bergerak range tanpa tren jelas, crossover MACD terjadi berulang dengan hasil acak, menghasilkan rangkaian sinyal palsu yang menggerus modal. Identifikasi dulu apakah pasar sedang tren atau sideways sebelum mempercayai sinyal MACD.

Kesalahan kedua adalah entry terlalu cepat pada divergensi tanpa konfirmasi. Divergensi menandakan potensi pembalikan, tetapi timing-nya tidak pasti — bisa memakan hari hingga minggu. Entry prematur pada divergensi sering berakhir tertahan posisi merah.

Kesalahan ketiga adalah mengabaikan histogram. Banyak pemula hanya melihat crossover garis dan melewatkan informasi berharga dari perubahan histogram, yang sebenarnya memberi sinyal lebih awal tentang pelemahan atau penguatan momentum.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| cara membaca macd saham | judul + pengenalan |
| sinyal crossover macd | bagian sinyal |
| divergensi macd | bagian divergensi |
| strategi trading macd | bagian strategi |
| indikator macd pemula | target pembaca |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "cara-membaca-bollinger-bands-saham",
    title: "Cara Membaca Bollinger Bands Saham untuk Pemula",
    excerpt:
      "Panduan lengkap Bollinger Bands untuk trading saham BEI: komponen upper/middle/lower band, squeeze, breakouts, dan strategi mean reversion yang praktis.",
    content: `## Apa Itu Bollinger Bands?

Bollinger Bands adalah indikator teknikal yang dikembangkan oleh John Bollinger pada 1980-an. Indikator ini terdiri dari tiga garis yang membungkus pergerakan harga, membantu trader mengukur volatilitas sekaligus mengidentifikasi kondisi overbought dan oversold relatif. Bollinger Bands menjadi salah satu indikator paling serbaguna untuk trader saham di Bursa Efek Indonesia (BEI).

Berbeda dengan indikator tunggal, Bollinger Bands memberikan konteks dinamis: lebar band menyesuaikan dengan volatilitas pasar. Saat volatilitas tinggi band melebar, saat volatilitas rendah band menyempit. Karakter adaptif inilah yang membuatnya begitu berguna untuk membaca berbagai kondisi pasar.

## Tiga Komponen Bollinger Bands

Bollinger Bands terdiri dari tiga garis:

- **Middle Band**: Simple Moving Average (SMA) 20 hari. Garis ini menjadi acuan tengah dan merepresentasikan tren jangka pendek.
- **Upper Band**: SMA 20 ditambah dua standar deviasi. Menandakan batas atas harga dalam kondisi normal.
- **Lower Band**: SMA 20 dikurangi dua standar deviasi. Menandakan batas bawah harga.

Konsep kuncinya adalah standar deviasi. Sekitar 95% pergerakan harga dalam distribusi normal berada di antara upper dan lower band. Karena itu, harga yang menyentuh upper band dianggap relatif mahal (overbought), dan yang menyentuh lower band dianggap relatif murah (oversold).

## Bollinger Squeeze dan Breakout

:::tip[Squeeze Adalah Presisi Breakout]
Saat band menyempit ekstrem (squeeze), breakouts besar sering mengikuti. Squeeze bukan menunjukkan arah, tapi mengisyaratkan volatilitas akan meledak. Siapkan strategi untuk kedua arah dan tunggu konfirmasi penembusan.
:::

Salah satu pola paling powerful dari Bollinger Bands adalah <strong>squeeze</strong> — kondisi ketika upper dan lower band menyempit secara signifikan, menandakan volatilitas sangat rendah. Squeeze adalah jeda konsolidasi yang hampir selalu diikuti pergerakan eksplosif.

Arah breakout dari squeeze tidak dapat diprediksi oleh Bollinger Bands sendiri. Harga bisa meledak ke atas atau ke bawah. Karena itu, trader menunggu konfirmasi: harga closing di luar upper band (breakout bullish) atau di bawah lower band (breakout bearish), idealnya disertai lonjakan volume.

Strategi praktis: identifikasi saham yang sedang squeeze, lalu siapkan order bersyarat di kedua sisi. Begitu penembusan terjadi dengan volume, eksekusi sesuai arah. Pendekatan ini menangkap pergerakan besar sejak awal dengan risk terdefinisi (stop-loss di middle band atau sisi berlawanan).

## Strategi Mean Reversion dengan Bollinger Bands

Strategi klasik Bollinger Bands adalah <strong>mean reversion</strong>: harga cenderung kembali ke middle band (SMA 20) setelah menyentuh band ekstrem. Trader menjual (atau take profit) saat harga di upper band, dan membeli saat harga di lower band.

Strategi ini paling efektif di pasar sideways atau range-bound, di mana harga bergerak bolak-balik di antara band. Di tren kuat, however, harga bisa "menempel" di upper atau lower band untuk waktu lama — mean reversion gagal dan trader tertahan. Karena itu, konfirmasi tren sangat penting sebelum menerapkan strategi ini.

:::tip[Kombinasikan dengan RSI untuk Akurasi]
Harga di lower band + RSI oversold = sinyal beli mean reversion berkualitas tinggi. Harga di upper band + RSI overbought = sinyal jual. Kombinasi dua indikator secara signifikan mengurangi false signal.
:::

Varian strategi ini adalah <strong>Bollinger bounce</strong>: cari saham yang harga-nya secara konsisten memantul dari lower atau upper band selama periode tertentu. Pola ini menunjukkan adanya pembeli atau penjual kuat di level band tersebut, menciptakan range trading yang bisa dieksploitasi berulang.

## Bollinger Bands di Tren Kuat

Salah satu kesalahpahaman umum adalah menganggap sentuhan upper band selalu sinyal jual dan lower band selalu sinyal beli. Pada tren bullish kuat, harga sering berjalan di sepanjang upper band — ini bukan sinyal jual, melainkan konfirmasi momentum kuat.

John Bollinger sendiri merumuskan prinsip ini: <em>"bands do not signal direction, they signal relative price levels"</em>. Artinya, band menunjukkan tingkat harga relatif, bukan arah. Untuk menentukan arah, gunakan indikator lain seperti MACD atau slope middle band.

Saat middle band (SMA 20) bergerak naik jelas, tren bullish berlangsung — harga di upper band adalah normal, bukan overbought. Sebaliknya saat middle band turun, tren bearish — harga di lower band normal. Selalu kontekstualisasikan posisi harga terhadap slope middle band sebelum menginterpretasikan sinyal.

## Menerapkan di Saham IDX

Untuk saham IDX, Bollinger Bands sangat berguna untuk mengidentifikasi saham yang sedang konsolidasi (kandidat breakout) dan saham yang bergerak range (kandidat mean reversion). Screener TeknikalID dapat membantu menyaring saham berdasarkan posisi harga relatif terhadap band.

Saham likuid besar seperti BBCA, BBRI, atau TLKM cenderung menghormati band lebih teratur karena partisipasi pasar luas. Sebaliknya, saham gorengan sering menembus band secara dramatis tanpa mean reversion, karena pergerakannya didorong segelintir pemain — berhati-hatilah menerapkan strategi mean reversion pada saham ini.

Saham sektor perbankan seperti BMRI sering menunjukkan pola Bollinger yang rapi selama periode konsolidasi, menjadikannya kandidat baik untuk strategi squeeze breakout. Sebaliknya saham komoditi yang lebih volatil cenderung memiliki band lebih lebar dengan pergeraban lebih cepat.

:::cta[Lihat Bollinger Bands Setiap Saham]
Halaman saham TeknikalID menampilkan Bollinger Bands interaktif lengkap dengan sinyal dan rekomendasi trading plan otomatis untuk seluruh saham IDX.
:::

## Kesalahan Umum Pemula

Kesalahan terbesar adalah menjual begitu harga sentuh upper band atau membeli begitu sentuh lower band, tanpa mempertimbangkan konteks tren. Pada tren kuat, strategi ini berakibat fatal. Selalu cek arah tren sebelum bertindak.

Kesalahan kedua adalah mengabaikan volume saat breakout. Breakout dari squeeze tanpa dukungan volume sering false breakout. Volume adalah konfirmasi paling andal bahwa pergerakan nyata.

Kesalahan ketiga adalah menggunakan periode default (20, 2) secara kaku untuk semua saham. Saham dengan karakter berbeda mungkin lebih cocok dengan setting berbeda. Eksperimen dengan periode pada saham spesifik sering meningkatkan akurasi.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| cara membaca bollinger bands | judul + pengenalan |
| bollinger bands squeeze | bagian squeeze |
| strategi mean reversion | bagian strategi |
| bollinger bands breakout | bagian squeeze |
| indikator bollinger pemula | target pembaca |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "per-dan-pbv-cara-membaca-valuasi-saham",
    title: "PER dan PBV: Cara Membaca Valuasi Saham BEI",
    excerpt:
      "Memahami Price to Earnings Ratio (PER) dan Price to Book Value (PBV) untuk valuasi saham BEI. Pelajari cara membaca, benchmark per sektor, dan kapan saham undervalued atau overvalued.",
    content: `## Apa Itu PER dan PBV?

PER (Price to Earnings Ratio) dan PBV (Price to Book Value) adalah dua metrik valuasi paling fundamental dalam analisa saham. Berbeda dengan indikator teknikal yang membaca pergerakan harga, PER dan PBV membaca apakah harga saham saat ini wajar (fair), murah (undervalued), atau mahal (overvalued) dibandingkan fundamental perusahaan.

Bagi investor saham di Bursa Efek Indonesia (BEI), memahami PER dan PBV adalah langkah penting dari trader spekulatif menuju investor rasional. Kedua metrik ini menjadi bahasa standar yang dipakai analis dan investor institusi dalam menilai saham, termasuk saham blue chip seperti BBCA, BBRI, atau TLKM.

## Memahami PER (Price to Earnings Ratio)

PER dihitung dengan membagi harga saham dengan laba per saham (Earnings Per Share / EPS). Rumusnya sederhana: PER = Harga Saham / EPS. Hasilnya menunjukkan berapa kali investor bersedia membayar untuk setiap rupiah laba perusahaan.

Contoh: saham harga Rp 8.000 dengan EPS Rp 800 memiliki PER 10x. Artinya, investor membayar 10 kali laba tahunan perusahaan. Secara teori, PER 10x berarti butuh 10 tahun untuk balik modal dari laba (asumsi laba konstan).

Interpretasi PER bergantung konteks:

- **PER rendah**: saham relatif murah, potensi undervalued. Bisa juga berarti pasar pesimis terhadap prospek perusahaan.
- **PER tinggi**: saham relatif mahal, potensi overvalued. Bisa juga berarti pasar optimis dan menanti pertumbuhan tinggi.

PER tidak bisa dinilai mutlak. PER 15x yang mahal untuk sektor perbankan mungkin murah untuk sektor teknologi. Selalu bandingkan PER dengan rata-rata sektor dan historis perusahaan itu sendiri.

## Memahami PBV (Price to Book Value)

:::tip[PBV Lebih Andal untuk Perbankan]
Untuk saham bank dan keuangan, PBV sering lebih relevan dibanding PER karena aset dan ekuitas mencerminkan inti bisnis. Investor bank terbiasa menilai berdasarkan PBV historis dan rata-rata sektor.
:::

PBV dihitung dengan membagi harga saham dengan nilai buku per saham (Book Value Per Share). Rumusnya: PBV = Harga Saham / BVPS. Nilai buku adalah ekuitas perusahaan (aset dikurangi liabilitas) dibagi jumlah saham.

Interpretasi PBV:

- **PBV di bawah 1**: saham diperdagangkan di bawah nilai bukunya — potensi undervalued. Pasar menilai perusahaan lebih rendah dari nilai asetnya.
- **PBV di atas 1**: saham di atas nilai buku — pasar percaya perusahaan menghasilkan return di atas biaya modalnya.
- **PBV tinggi (>3)**: saham relatif mahal, pasar sangat optimis terhadap prospek dan ROE perusahaan.

PBV sangat relevan untuk perusahaan berbasis aset seperti bank, properti, dan keuangan. Untuk perusahaan berbasis layanan atau teknologi dengan sedikit aset fisik, PBV kurang bermakna karena nilai utamanya ada pada brand, SDM, dan intellectual property yang tidak tercatat penuh di neraca.

## Benchmark PER dan PBV per Sektor

Valuasi bervariasi besar antar sektor di BEI. Berikut gambaran umum (selalu verifikasi dengan data terkini):

- **Perbankan**: biasanya PER 8–14x, PBV 1–2.5x. Bank besar seperti BBCA sering trading di PBV premium karena ROE tinggi dan kualitas aset.
- **Consumer goods**: PER cenderung tinggi 20–30x karena pertumbuhan stabil dan defensif. PBV juga tinggi.
- **Komoditi (tambang, sawit)**: PER fluktuatif mengikuti siklus harga komoditas. Saat harga tinggi PER rendah, sebaliknya.
- **Telekomunikasi**: PER moderat 10–18x, PBV rendah karena bisnis padat modal.
- **Properti**: PBV sering di bawah 1 selama pasar lemah, mengindikasikan diskon terhadap nilai aset.

Strategi investasi berbasis valuasi adalah <strong>value investing</strong>: cari saham dengan PER dan PBV di bawah rata-rata sektor dan historisnya, dengan fundamental perusahaan yang sehat. Pendekatan ini dipopulerkan oleh Benjamin Graham dan Warren Buffett, dan terbukti menghasilkan return konsisten jangka panjang.

## Kesalahan Membaca PER dan PBV

Kesalahan paling sering adalah menyamaratakan PER rendah sebagai sinyal beli. PER rendah bisa berarti saham murah, tetapi juga bisa berarti pasar benar memvonis perusahaan bermasalah — laba anjlok, utang tinggi, atau prospek gelap. <em>Value trap</em> adalah jebakan klasik: saham tampak murah tapi tetap jatuh karena fundamental memburuk.

Kesalahan kedua adalah mengabaikan kualitas laba. EPS tinggi bisa datang dari keuntungan sekali-sekali (penjualan aset, rekonsiliasi) yang tidak berulang. Selalu periksa apakah laba berasal dari operasi inti yang berkelanjutan.

Kesalahan ketiga adalah membandingkan PER lintas sektor secara langsung. PER 25x untuk consumer goods mungkin wajar, tapi mungkin ekstrem untuk perbankan. Selalu bandingkan dengan peers di sektor yang sama.

## Menggabungkan Valuasi dan Teknikal

Investor cerdas menggabungkan analisa valuasi (fundamental) dan teknikal. Valuasi menjawab "apa saham ini layak beli?", teknikal menjawab "kapan waktu terbaik membeli?". Sebuah saham undervalued secara PER/PBV mungkin sedang downtrend teknikal — menunggu hingga teknikal menunjukkan reversal menghemat modal dan mengurangi drawdown.

:::tip[Gabungkan PER/PBV dengan RSI dan Tren]
Saham dengan PER/PBV rendah (undervalued) yang RSI-nya oversold setelah koreksi panjang sering menjadi peluang value terbaik. Fundamental murah + timing teknikal bagus = setup berkualitas tinggi.
:::

Screener TeknikalID membantu menyaring saham berdasarkan sinyal teknikal. Untuk valuasi fundamental, gunakan dalam kombinasi dengan riset laporan keuangan dan data referensi sektor. Pendekatan holistik fundamental + teknikal secara konsisten menghasilkan keputusan investasi lebih baik dibanding mengandalkan salah satu saja.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| per dan pbv saham | judul + pengenalan |
| cara membaca valuasi saham | judul + target |
| price to earnings ratio | bagian PER |
| price to book value | bagian PBV |
| saham undervalued overvalued | interpretasi |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
  {
    slug: "support-dan-resistance-saham-cara-menentukan",
    title: "Support dan Resistance Saham: Cara Menentukan Level",
    excerpt:
      "Panduan lengkap menentukan support dan resistance saham BEI: definisi, cara menggambar level yang akurat, breakouts, dan strategi trading di area kunci.",
    content: `## Apa Itu Support dan Resistance?

Support dan resistance adalah dua konsep paling fundamental dalam analisa teknikal saham. Level support adalah area harga di mana tekanan beli cukup kuat untuk menghentikan penurunan lebih lanjut. Level resistance adalah area di mana tekanan jual cukup kuat untuk menghentikan kenaikan lebih lanjut.

Konsep ini menjadi pondasi hampir semua strategi trading di Bursa Efek Indonesia (BEI). Memahami support dan resistance sama dengan memahami di mana harga kemungkinan berbalik arah — informasi paling berharga bagi trader untuk menentukan entry, exit, dan stop-loss.

## Cara Menentukan Level Support

Level support dapat diidentifikasi melalui beberapa metode:

- **Swing lows historis**: titik terendah sebelumnya yang menjadi area pembelian berulang. Harga cenderung memantul di level ini karena pembeli menganggapnya murah.
- **Moving average**: SMA 50, 100, atau 200 sering berfungsi sebagai support dinamis selama tren bullish. Harga sering memantul dari moving average ini.
- **Round numbers**: level psikologis seperti Rp 5.000 atau Rp 10.000 sering menjadi support karena banyak trader menempatkan order di angka bulat.
- **Fibonacci retracement**: level 38.2%, 50%, dan 61.8% dari swing besar sering menjadi support alami.

Kombinasi beberapa metode memperkuat validitas support. Jika swing low historis, Fibonacci 50%, dan SMA 50 berkumpul di area yang sama, level support tersebut sangat signifikan dan kemungkinan memantulkan harga tinggi.

## Cara Menentukan Level Resistance

:::tip[Resistance yang Ditembus Menjadi Support]
Aturan klasik: ketika resistance tembus dengan kuat, level itu berubah menjadi support baru. Demikian pula support yang ditembus menjadi resistance. Konsep <em>polarity change</em> ini sangat berguna untuk menentukan level kunci setelah breakout.
:::

Level resistance diidentifikasi dengan cara serupa tetapi dari sisi atas:

- **Swing highs historis**: titik tertinggi sebelumnya di mana harga berulang kali ditolak naik.
- **Moving average** dalam tren bearish: SMA berfungsi sebagai resistance dinamis.
- **Round numbers** di sisi atas: level psikologis yang menjadi target take-profit.
- **Extension Fibonacci**: level 127.2% atau 161.8% sering menjadi resistance setelah breakout.

Resistance yang diuji berulang tanpa ditembus menjadi semakin kuat. Setiap kali harga ditolak di resistance, semakin banyak trader yang menempatkan order jual di sana, memperkuat level tersebut. Sebaliknya, resistance yang baru saja ditembus dengan volume besar cenderung menjadi support yang kuat.

## Breakout dan Pullback

<strong>Breakout</strong> terjadi ketika harga menembus support atau resistance dengan signifikan, idealnya disertai lonjakan volume. Breakout resistance menandakan tren bullish baru, breakout support menandakan tren bearish.

Namun tidak semua breakout valid. <strong>False breakout</strong> atau <em>fakeout</em> terjadi ketika harga menembus level sebentar lalu berbalik arah, menjebak trader yang masuk terlalu cepat. Untuk membedakannya:

- Tunggu <strong>closing</strong> di luar level, bukan hanya sentuhan intraday. Closing harian di luar resistance lebih meyakinkan.
- Konfirmasi dengan <strong>volume</strong>. Breakout valid biasanya disertai volume di atas rata-rata.
- Perhatikan <strong>retest</strong>. Setelah breakout, harga sering pullback ke level yang ditembus untuk retest. Jika level baru (support) bertahan, itu konfirmasi kuat.

:::tip[Strategi Pullback Lebih Aman]
Menunggu pullback ke level yang baru ditembus memberikan entry dengan risk-reward lebih baik dan stop-loss lebih ketat dibanding mengejar breakout begitu terjadi. Sabar membayar dalam trading.
:::

## Strategi Trading di Support dan Resistance

Strategi pertama adalah <strong>trading di area kunci</strong>: beli dekat support yang kuat, jual dekat resistance yang kuat. Stop-loss ditempatkan sedikit di bawah support (untuk posisi beli) atau di atas resistance (untuk posisi jual). Pendekatan ini memberikan risk-reward jelas.

Strategi kedua adalah <strong>trading breakout</strong>: beli saat resistance ditembus dengan volume, jual saat support ditembus. Pendekatan ini menangkap pergerakan besar tetapi rentan false breakout.

Strategi ketiga adalah <strong>trading pullback</strong>: setelah breakout valid, tunggu harga pullback ke level yang ditempus (sekarang menjadi support/resistance baru), lalu entry searah breakout. Strategi ini menyeimbangkan konfirmasi dan harga entry yang baik.

Kombinasi support/resistance dengan indikator seperti RSI atau MACD meningkatkan akurasi. Misalnya, support yang bertahan disertai RSI oversold dan divergensi bullish memberikan setup beli berkualitas sangat tinggi.

## Penerapan di Saham IDX

Untuk saham IDX, support dan resistance paling andal pada saham likuid besar seperti BBCA, BBRI, BMRI, atau TLKM, di mana partisipasi pasar luas membuat level kunci lebih terhormati. Pada saham gorengan, support/resistance sering tidak terhormati karena manipulasi harga dan likuiditas rendah.

Screener dan halaman saham TeknikalID membantu mengidentifikasi level support dan resistance otomatis berdasarkan pivot points dan analisa struktur pasar. Rekomendasi trading plan otomatis menggunakan level-level ini untuk menentukan entry, target, dan stop-loss yang logis.

Saham perbankan besar seperti BBCA cenderung menghormati level kunci dengan rapi karena partisipasi institusional besar. Sebaliknya, saham sektor yang lebih kecil atau illiquid sering menembus level secara tak terduga, menuntut manajemen risiko lebih ketat dan ukuran posisi lebih kecil.

:::cta[Tentukan Level Otomatis Setiap Saham]
Halaman saham TeknikalID menampilkan level support dan resistance otomatis, pivot points, dan trading plan lengkap dengan entry, target, dan stop-loss untuk seluruh saham IDX.
:::

## Kesalahan Umum Menentukan Level

Kesalahan terbesar adalah menggambar support/resistance sebagai garis tipis persis, padahal level lebih baik dipahami sebagai <strong>area atau zona</strong>. Harga jarang berbalik tepat di satu titik — biasanya di kisaran level. Menggambar zona (bukan garis presisi) memberi fleksibilitas dan menghindari stop-loss terkenal karena noise kecil.

Kesalahan kedua adalah menggunakan timeframe terlalu kecil. Level di chart 5 menit penuh noise dan tidak andal. Gunakan chart harian atau mingguan untuk level kunci yang dihormati banyak trader.

Kesalahan ketiga adalah mengabaikan konfirmasi. Entry di support tanpa konfirmasi (candlestick reversal, RSI, volume) sering berakhir rugi ketika support ditembus. Selalu tunggu bukti bahwa level benar-benar bertahan sebelum commit modal.

## Kata Kunci Terkait

| Keyword | Konteks penggunaan |
|---------|---------|
| support dan resistance saham | judul + pengenalan |
| cara menentukan support resistance | bagian penentuan level |
| breakout saham | bagian breakout |
| trading support resistance | bagian strategi |
| level kunci saham | definisi |

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::`,
  },
];

async function main() {
  let created = 0, skipped = 0;
  for (const a of articles) {
    const existing = await prisma.article.findUnique({ where: { slug: a.slug } });
    if (existing) { console.log(`skip (exists): ${a.slug}`); skipped++; continue; }
    await prisma.article.create({
      data: {
        slug: a.slug, title: a.title, excerpt: a.excerpt, content: a.content,
        authorId: ADMIN_AUTHOR_ID, articleType: "EDUCATIONAL", status: "PUBLISHED",
        isListed: true, tickerTag: null, tags: [], aiProvider: "manual", publishedAt: new Date(),
      },
    });
    console.log(`published: ${a.slug}`); created++;
  }
  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
