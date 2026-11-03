/**
 * glossary-deep-dives — konten lanjutan 15 istilah prioritas glosarium
 * (PRD im-2026-10-29-2 fase-2 / prd-2026-11-02-03).
 *
 * PRINSIP:
 * 1. SATU PINTU angka: field `example` hanya SPEC (kind + preset), BUKAN angka.
 *    Angka nyata di-render server-side oleh <GlossaryExample /> via service
 *    existing (marketSnapshotService / screener / StockDividend / StockFundamental).
 *    DILARANG mengarang angka di file ini (rule qa-30-01).
 * 2. Depth gate: istilah lolos sitemap hanya bila deep-dive >=300 kata total
 *    (definition + sections) + punya contoh + link artikel akademi.
 * 3. 15 slug deterministik: 5 TermTip fase-1 + 10 fundamental/pasar urut slug.
 */

export interface GlossaryArticleLink {
  slug: string; // slug Article PUBLISHED type EDUCATIONAL — verified selftest C3
  title: string;
}

export type GlossaryExampleSpec =
  | { kind: "screener_top"; preset: string; note?: string }
  | { kind: "oversold_count" }
  | { kind: "dividend_upcoming" }
  | { kind: "fundamental_top"; note?: string }
  | { kind: "ipo_recent" }
  | { kind: "ihsg_snapshot" }
  | { kind: "lot_math" };

export interface GlossaryDeepDive {
  /** Paragraf cara-membaca (>=2 sections utk depth; judul pendek, bahasa pemula). */
  sections: { heading: string; body: string }[];
  /** Internal-link artikel akademi PUBLISHED (>=1 utk depth gate). */
  articles: GlossaryArticleLink[];
  /** Spec contoh angka nyata — resolved server-side, SATU PINTU. */
  example: GlossaryExampleSpec;
}

/** 15 slug prioritas deterministik (urut dokumen PRD, tampil urut alfabetis di UI). */
export const PRIORITY_SLUGS: readonly string[] = [
  // 5 TermTip fase-1 — terbukti dipakai 3 halaman kondisi
  "rsi",
  "moving-average",
  "golden-cross",
  "death-cross",
  "oversold",
  // 10 fundamental/pasar urut slug
  "blue-chip",
  "dividen",
  "eps",
  "ihsg",
  "ipo",
  "lot",
  "market-cap",
  "pbv",
  "per",
  "saham",
];

const D = (heading: string, body: string) => ({ heading, body });

export const GLOSSARY_DEEP_DIVES: Record<string, GlossaryDeepDive> = {
  rsi: {
    sections: [
      D("Cara membaca RSI", "RSI dihitung dari rata-rata kenaikan dan penurunan harga dalam 14 hari perdagangan terakhir. Hasilnya selalu berada di antara 0 sampai 100. Angka di atas 70 disebut overbought alias jenuh beli: harga naik terlalu cepat dan berpeluang mengalami koreksi. Angka di bawah 30 disebut oversold alias jenuh jual: harga turun terlalu jauh dan sering mendahului pantulan. Zona 30 sampai 70 dianggap netral, artinya belum ada sinyal ekstrem pada saham tersebut. Perlu diingat, saham yang kuat bisa bertahan di atas 70 selama berminggu-minggu, dan saham lemah bisa terus berada di bawah 30. Karena itu RSI paling baik dipakai sebagai konteks, bukan sebagai tombol beli atau jual tunggal."),
      D("Kesalahan pemula yang sering terjadi", "Kesalahan paling umum adalah langsung menjual hanya karena RSI menyentuh 75, atau langsung membeli hanya karena RSI turun ke 28. Pada tren naik yang kuat, RSI memang bisa bertahan lama di zona overbought. Sebaliknya pada tren turun, RSI bisa lama sekali berada di bawah 30 dan harga terus jatuh. Praktik yang lebih aman adalah menggabungkan RSI dengan arah tren: sinyal jenuh jual hanya lebih berarti ketika tren utamanya sedang naik, dan sinyal jenuh beli lebih berarti ketika tren utamanya sedang turun. Perhatikan juga divergensi, yaitu kondisi ketika harga membuat titik terendah baru tetapi RSI tidak — ini sering menjadi petunjuk awal pembalikan arah. Terakhir, RSI pada saham gorengan yang peredarannya kecil jauh lebih mudah menipu karena pergerakan harganya didominasi segelintir pemain."),
      D("Contoh pemakaian di dunia nyata", "Bayangkan saham bank besar yang selama tiga bulan bergerak naik perlahan, lalu tiba-tiba turun tajam dua hari berturut-turut karena berita pasar global. RSI-nya bisa jatuh ke zona 28 padahal kondisi perusahaannya tidak berubah. Banyak pemula panik dan menjual di titik terbawah, sementara harga biasanya bergerak naik kembali mengikuti tren lamanya. Sebaliknya, saham yang tumbuh terlalu cepat karena euforia bisa membuat pemula tergoda mengejar harga di RSI 80, lalu terjebak saat koreksi datang. Kedua skenario ini menunjukkan mengapa RSI paling berguna untuk mengukur seberapa jauh harga bergerak dibanding biasanya, bukan untuk menebak arah berikutnya secara pasti. Disiplin menggabungkan RSI dengan strategi keluar yang jelas akan jauh lebih menentukan hasil daripada satu angka RSI saja."),
    ],
    articles: [
      { slug: "cara-membaca-rsi-saham-panduan-lengkap-pemula", title: "Cara Membaca RSI Saham: Panduan Lengkap Pemula" },
      { slug: "saham-oversold-arti-cara-membaca-dan-strategi", title: "Saham Oversold: Arti, Cara Membaca, dan Strategi Membeli yang Benar" },
    ],
    example: { kind: "screener_top", preset: "rsi_oversold" },
  },

  "moving-average": {
    sections: [
      D("Cara membaca moving average", "Moving average adalah rata-rata harga selama periode tertentu, misalnya 20 hari atau 200 hari, yang dihitung ulang setiap hari. Garis yang dihasilkan meratakan noise pergerakan harian sehingga arah tren menjadi lebih mudah dilihat. Kalau harga bergerak di atas moving average dan garisnya menanjak, tren sedang naik. Kalau harga berada di bawah garis dan garisnya menurun, tren sedang turun. Semakin panjang periodenya, semakin lambat garis bereaksi: MA20 cocok untuk melihat momentum jangka pendek, sedangkan MA200 dipakai untuk melihat tren besar tahunan. Banyak trader pemula memakai MA50 dan MA200 bersamaan karena perpotongan keduanya menghasilkan sinyal golden cross dan death cross yang dibahas pada istilah lain di glosarium ini."),
      D("SMA vs EMA dan kapan dipakai", "Simple Moving Average atau SMA memberi bobot yang sama ke semua hari dalam periode, jadi setiap hari baru menggeser garis sedikit saja. Exponential Moving Average atau EMA memberi bobot lebih besar ke hari-hari terakhir sehingga lebih cepat merespons perubahan harga. EMA12 dan EMA26 adalah pasangan populer karena selisih keduanya menjadi bahan perhitungan indikator MACD. Untuk pemula, SMA20 sering dipakai sebagai acuan pullback pada tren naik: harga yang sehat biasanya turun secukupnya ke dekat SMA20 lalu lanjut naik. EMA lebih cocok untuk trader jangka pendek yang butuh sinyal cepat, meski konsekuensinya sinyal palsu juga lebih sering muncul. Tidak ada satu periode yang paling benar; yang penting konsisten memakai periode yang sama ketika menilai banyak saham."),
      D("Kesalahan umum dan cara mengatasinya", "Kesalahan terbesar adalah memperlakukan moving average sebagai tembok yang tidak bisa ditembus. Kenyataannya harga sering menembus garis naik atau turun berkali-kali di pasar menyamping, dan setiap tembusan palsu memicu sinyal yang menyesatkan. Solusinya adalah menunggu konfirmasi, misalnya candle harian yang ditutup di bawah garis, bukan sekadar sentuhan sesaat. Kesalahan kedua adalah memakai terlalu banyak garis sekaligus sampai grafik penuh dan keputusan jadi bingung. Dua sampai tiga garis dengan periode berbeda biasanya sudah cukup untuk membaca struktur tren. Ingat juga bahwa moving average selalu tertinggal dari harga karena dihitung dari data masa lalu; fungsinya mengonfirmasi tren yang sudah berjalan, bukan memprediksi puncak atau dasar secara tepat."),
    ],
    articles: [
      { slug: "moving-average-saham-sma-ema-panduan-lengkap", title: "Moving Average Saham: Panduan Lengkap SMA dan EMA untuk Pemula" },
      { slug: "ema-cross-arti-sinyal-ema12-ema26-dan-strategi-saham", title: "EMA Cross: Arti Sinyal Cepat EMA12/EMA26 dan Cara Membacanya" },
    ],
    example: { kind: "screener_top", preset: "pullback_sma20" },
  },

  "golden-cross": {
    sections: [
      D("Cara membaca golden cross", "Golden cross terjadi ketika moving average jangka pendek, biasanya MA50, memotong ke atas moving average jangka panjang, biasanya MA200. Perpotongan ini dibaca sebagai peralihan ke tren naik karena rata-rata harga 50 hari akhirnya bergerak lebih tinggi daripada rata-rata 200 hari. Semakin lama harga bergerak menyempit sebelum perpotongan, semakin bertenaga gerakan yang menyusul. Sinyal ini terkenal andal pada saham likuid besar karena pergerakannya halus dan sulit dimanipulasi. Namun golden cross bukan sinyal instan: perpotongan MA50 dan MA200 butuh waktu lama terbentuk, sehingga harga biasanya sudah naik cukup jauh dari dasar sebelum sinyal ini muncul."),
      D("Kapan golden cross layak dipercaya", "Kekuatan sinyal sangat bergantung pada kualitas sahamnya. Pada saham likuid dengan kapitalisasi besar, golden cross sering menandai awal tren naik berbulan-bulan. Pada saham gorengan yang peredarannya kecil, pola yang sama bisa sengaja dibuat segelintir pemain untuk menarik pembeli sebelum mereka distribusi di harga atas. Cek juga posisi volume: golden cross yang disertai volume meningkat jauh lebih meyakinkan daripada yang terjadi dengan volume tipis. Konteks pasar juga penting; ketika IHSG sedang tertekan, golden cross individual lebih sering gagal. Terakhir, golden cross bukan alasan untuk membeli tanpa rencana keluar — tetap tentukan level stop karena sinyal apa pun bisa salah."),
      D("Strategi praktis untuk pemula", "Alih-alih membeli persis di hari perpotongan, pemula bisa menunggu pullback pertama setelah golden cross terbentuk, biasanya ke area MA50, untuk masuk dengan risiko lebih kecil. Target pertama yang wajar adalah mengikuti tren selama MA50 bertahan di atas MA200, dan keluar ketika harga mulai menutup harian di bawah MA50 secara konsisten. Kombinasikan dengan RSI untuk menghindari masuk saat harga sudah jenuh. Untuk yang tidak mau memantau harian, golden cross pada grafik mingguan memberi sinyal lebih jarang tetapi jauh lebih sedikit noise. Layar screener golden cross harian bisa dipakai untuk mempersempit kandidat, lalu verifikasi manual satu per satu sebelum memutuskan."),
    ],
    articles: [
      { slug: "golden-cross-vs-death-cross-arti-cara-membaca-contoh-saham", title: "Golden Cross vs Death Cross: Arti Sinyal MA50/MA200 dan Contoh Saham RI" },
      { slug: "golden-cross-dan-death-cross-sinyal-strategi-saham", title: "Golden Cross dan Death Cross: Sinyal & Strategi Saham" },
    ],
    example: { kind: "screener_top", preset: "golden_cross" },
  },

  "death-cross": {
    sections: [
      D("Cara membaca death cross", "Death cross adalah kebalikan golden cross: MA50 memotong ke bawah MA200, menandai peralihan ke tren turun. Rata-rata harga 50 hari yang jatuh di bawah rata-rata 200 hari berarti tekanan jual sudah bertahan cukup lama dan bukan sekadar koreksi singkat. Seperti golden cross, sinyal ini juga bersifat tertinggal; biasanya harga sudah turun signifikan sebelum perpotongan terjadi. Karena itu banyak investor memakainya bukan untuk masuk pasar pendek, melainkan sebagai alarm untuk memperketat stop loss atau mengurangi posisi. Di pasar yang sedang bullish besar, death cross sering kali hanya menjadi koreksi tengah jalan sebelum tren naik berlanjut."),
      D("Yang harus dilakukan dan dihindari", "Ketika death cross muncul di saham yang Anda pegang, langkah pertama adalah membandingkan dengan kondisi fundamental dan sektor, bukan langsung panik menjual. Jika perusahaan sehat dan penurunan dipicu sentimen pasar, death cross bisa jadi kesempatan memantau titik masuk ulang, bukan pintu keluar. Yang perlu dihindari adalah melakukan averaging down buta pada saham yang death cross-nya disertai volume besar dan berita fundamental negatif, karena tren turun seperti itu bisa berlangsung berbulan-bulan. Untuk trader, death cross membuka peluang strategi pendek di pasar yang tersedia, tetapi risikonya tinggi bagi pemula. Disiplin posisi ukuran kecil dan stop yang jelas tetap menjadi pegangan utama."),
      D("Studi kasus nyata", "Saham blue chip pernah membentuk death cross saat koreksi pasar besar dan kembali pulih dalam beberapa bulan, sementara saham yang fundamentalnya memburuk lanjut turun bertahun-tahun setelah death cross yang sama. Bedanya ada pada konteks: yang pertama hanya kena sentimen, yang kedua pendapatannya benar-benar menyusut. Pelajaran pentingnya adalah death cross memberi tahu bahwa momentum sedang buruk, tetapi tidak memberi tahu penyebabnya. Gabungkan sinyal teknikal ini dengan membaca laporan keuangan terbaru sebelum mengambil keputusan besar. Historisnya, sinyal MA paling berguna pada indeks dan saham likuid, dan paling menipu pada saham tipis yang pergerakannya dikendalikan sedikit pemain."),
    ],
    articles: [
      { slug: "golden-cross-vs-death-cross-arti-cara-membaca-contoh-saham", title: "Golden Cross vs Death Cross: Arti Sinyal MA50/MA200 dan Contoh Saham RI" },
      { slug: "saham-gorengan-arti-ciri-ciri-dan-kenapa-golden-cross-nya-menipu", title: "Saham Gorengan: Arti, Ciri-Ciri, dan Kenapa Sinyal Golden Cross-nya Menipu" },
    ],
    example: { kind: "screener_top", preset: "death_cross" },
  },

  oversold: {
    sections: [
      D("Arti oversold dan cara mengukurnya", "Oversold berarti saham dianggap terjual terlalu jauh dalam waktu singkat sehingga harganya turun jauh di bawah nilai wajarnya. Alat ukur paling populer adalah RSI 14 hari: di bawah 30, saham masuk zona oversold. Kondisi ini biasanya muncul setelah rangkaian berita buruk, koreksi pasar besar, atau aksi jual panik. Secara statistik, banyak saham memang bergerak naik kembali setelah menyentuh zona ini karena mereka yang ingin menjual sudah kebanyakan keluar. Namun oversold bukan berarti harga pasti naik besok; saham dengan fundamental yang benar-benar rusak bisa tetap di zona oversold berhari-hari sambil terus turun."),
      D("Cara memilih saham oversold yang layak dibeli", "Langkah pertama adalah menyaring kandidatnya: utamakan saham likuid non-gorengan yang punya alasan jelas untuk pulih, misalnya bisnis tetap sehat dan penurunan murni ikut pasar. Periksa apakah ada divergensi positif, yaitu harga membuat rekor terendah baru tetapi RSI mulai naik — ini salah satu sinyal pembalikan klasik. Hindari saham oversold karena berita hukum, suspensi, atau utang yang tidak mampu dibayar. Untuk pemula, membeli bertahap dalam beberapa hari jauh lebih aman daripada sekali habis, karena titik dasar tidak pernah bisa ditebak persis. Tetapkan batas kerugian sejak awal; strategi beli oversold hanya punya nilai jika kerugian saat salah tetap terkendali."),
      D("Kesalahan klasik yang menghabiskan modal", "Kesalahan paling mahal adalah menjadikan satu angka RSI sebagai alasan utama membeli tanpa melihat kualitas sahamnya; saham gorengan yang jatuh bisa berlanjut jatuh jauh lebih dalam. Kesalahan kedua adalah membeli semua saham oversold sekaligus saat pasar panik, padahal ketika IHSG jatuh tajam korelasi antar saham tinggi dan portofolio bisa ikut tenggelam. Kesalahan ketiga adalah tidak punya rencana keluar: pantulan oversold sering hanya singkat, dan tanpa target keuntungan keuntungan itu menguap kembali. Disiplin sederhana seperti membatasi posisi per saham dan tidak menambah posisi yang rugi akan membuat strategi ini bertahan jangka panjang."),
    ],
    articles: [
      { slug: "saham-oversold-arti-cara-membaca-dan-strategi", title: "Saham Oversold: Arti, Cara Membaca, dan Strategi Membeli yang Benar" },
      { slug: "saham-overbought-arti-cara-membaca-rsi-dan-strategi", title: "Saham Overbought: Arti, Cara Membaca dengan RSI, dan Strategi yang Benar" },
    ],
    example: { kind: "oversold_count" },
  },

  "blue-chip": {
    sections: [
      D("Ciri-ciri saham blue chip", "Blue chip adalah saham perusahaan besar, mapan, dan terkenal stabil: bank besar, sembako, telekomunikasi, hingga energi. Ciri utamanya adalah kapitalisasi pasar yang besar, pendapatan yang tumbuh konsisten selama bertahun-tahun, likuiditas tinggi sehingga mudah dibeli dan dijual, serta rutin membagikan dividen. Saham seperti ini jarang memberi keuntungan berlipat dalam sebulan, tetapi juga jarang jatuh mendadak karena kondisi bisnisnya sudah teruji beberapa siklus ekonomi. Bagi pemula, blue chip sering jadi titik awal karena fluktuasinya lebih bisa diterima dan informasinya banyak tersedia. Bursa juga biasanya memasukkan saham-saham ini ke indeks besar seperti LQ45 atau IDX30 sehingga mudah dikenali."),
      D("Kelebihan dan keterbatasannya", "Kelebihan utama blue chip adalah keamanan relatif dan cash flow yang kuat: saat pasar jatuh, saham ini biasanya turun lebih dangkal dan pulih lebih cepat. Keterbatasannya adalah pertumbuhan yang lambat; perusahaan yang sudah sangat besar sulit bertumbuh secepat perusahaan kecil yang sedang naik. Karena itu investor agresif sering menempatkan blue chip sebagai fondasi portofolio, lalu menambahkan porsi kecil pada saham pertumbuhan dengan risiko lebih tinggi. Perlu diingat juga bahwa status blue chip bukan abadi: perusahaan besar bisa kehilangan pangsa dan menjadi value trap kalau bisnis intinya terdisrupsi. Tetap pantau laporan kuartalan walaupun sahamnya sudah dianggap paling aman."),
      D("Cara praktis menilainya", "Mulailah dari angka yang mudah dicek: laba bersih stabil atau tumbuh, utang yang wajar terhadap ekuitas, dan dividen yang dibayar konsisten. Bandingkan valuasi seperti PER dengan rata-rata historisnya sendiri, bukan hanya dengan saham lain. Perhatikan posisi pasar perusahaan, apakah masih pemimpin di industrinya atau mulai tergerus. Layar screener blue chip yang memakai kriteria kapitalisasi, profitabilitas, dan likuiditas bisa mempercepat penyaringan awal. Terakhir, karena harga blue chip bergerak lambat, strategi beli bertahap dan menyimpan jangka panjang cocok dengan karakternya; trading harian pada saham ini justru sering kalah oleh biaya transaksi."),
    ],
    articles: [
      { slug: "per-dan-pbv-cara-membaca-valuasi-saham", title: "PER dan PBV: Cara Membaca Valuasi Saham BEI" },
      { slug: "belajar-saham-dari-nol-panduan-langkah-demi-langkah-pemula", title: "Belajar Saham dari Nol: Panduan Langkah demi Langkah untuk Pemula" },
    ],
    example: { kind: "fundamental_top" },
  },

  dividen: {
    sections: [
      D("Empat tanggal penting dalam dividen", "Dividen adalah bagian laba perusahaan yang dibagikan ke pemegang saham, dan prosesnya diatur oleh empat tanggal kunci. Cum date adalah hari terakhir Anda harus memegang saham agar berhak mendapat dividen. Ex date adalah hari pertama saham diperdagangkan tanpa hak dividen; di hari ini harga dibuka lebih rendah kira-kira sebesar nilai dividen. Record date adalah tanggal bursa mencatat daftar pemegang saham yang berhak, sedangkan payment date adalah tanggal uang dividen benar-benar masuk ke rekening. Kesalahan paling umum pemula adalah membeli di hari ex date dan tetap berharap dapat dividen, padahal hak itu sudah tidak melekat lagi pada saham yang dibeli."),
      D("Dividen tunai vs dividen saham", "Dividen tunai dibayar dengan uang ke rekening investor dan menjadi pendapatan nyata tanpa harus menjual saham. Dividen saham atau stock dividend memberikan tambahan lembar saham sehingga jumlah kepemilikan bertambah tetapi harga per lembar menyesuaikan turun; nilai total kepemilikan tidak berubah saat itu juga. Perusahaan besar yang mapan cenderung membagikan dividen tunai rutin, sedangkan perusahaan yang sedang menahan uang untuk ekspansi bisa memilih dividen saham atau tidak membagikan sama sekali. Pajak dividen tunai di Indonesia dipotong otomatis saat pembagian, jadi angka yang masuk rekening sudah bersih. Bagi investor jangka panjang, dividen tunai yang diinvestasikan kembali adalah mesin pertumbuhan majemuk yang sering diremehkan pemula."),
      D("Jangan terjebak dividen tinggi semata", "Dividen yield yang sangat tinggi sering kali justru sinyal bahaya: bisa karena harganya sudah jatuh drastis akibat masalah bisnis, atau karena dividen dibayar dari utang bukan laba. Ukuran yang lebih sehat adalah payout ratio, yaitu porsi laba yang dibagikan; angka yang berkelanjutan biasanya di bawah delapan puluh persen laba bersih. Cek juga konsistensi: perusahaan yang membayar dividen bertahun-tahun berturut-turut lebih bisa dipercaya daripada yang tiba-tiba membagikan besar sekali. Perhatikan kalender ex date karena harga saham biasanya bergerak aneh di sekitar tanggal-tanggal ini. Rencanakan strategi Anda sebelum tanggal cum, bukan setelah melihat harga turun di hari ex dan baru sadar hak dividen sudah lewat."),
    ],
    articles: [
      { slug: "cara-dapat-dividen-saham-4-tanggal-penting-ex-date-dan-pajaknya", title: "Cara Dapat Dividen Saham: 4 Tanggal Penting (Cum Date, Ex Date) dan Pajaknya" },
    ],
    example: { kind: "dividend_upcoming" },
  },

  eps: {
    sections: [
      D("Cara membaca EPS", "Earnings Per Share atau EPS adalah laba bersih perusahaan dibagi jumlah saham beredar, jadi angka ini menunjukkan berapa laba yang dihasilkan untuk setiap lembar saham. EPS yang tumbuh konsisten dari kuartal ke kuartal dan tahun ke tahun adalah tanda paling dasar bisnis yang sehat. Namun EPS tidak bisa berdiri sendiri: laba satu kuartal bisa membengkak karena keuntungan sekali saja seperti penjualan aset, yang tidak akan berulang. Karena itu bandingkan EPS dengan periode yang sama tahun lalu untuk memfilter musiman, dan baca catatan laporan keuangan untuk mengetahui dari mana laba berasal. EPS juga dipakai sebagai penyebut valuasi: harga saham dibagi EPS menghasilkan PER yang dibahas pada istilah lain."),
      D("EPS dasar vs EPS diluted", "EPS dasar memakai jumlah saham yang sudah beredar sekarang. EPS diluted menghitung skenario terburuk di mana semua instrument yang bisa menjadi saham, misalnya obligasi konversi atau opsi karyawan, benar-benar dikonversi sehingga jumlah saham bertambah dan EPS tersedia menjadi lebih tipis. Perbedaan yang besar antara keduanya adalah tanda ada potensi pengenceran kepemilikan di masa depan, sesuatu yang jarang diperhatikan pemula. Jika perusahaan sering melakukan right issue atau memberikan opsi saham dalam jumlah besar, kepemilikan lama bisa terus terdilusi dan pertumbuhan EPS menjadi lambat meski laba naik. Untuk perbandingan antar perusahaan yang adil, banyak analis memakai EPS diluted sebagai patokan konservatif."),
      D("Jebakan membaca EPS", "Jebakan pertama adalah laba akuntansi yang tidak diikuti arus kas: perusahaan bisa mencatat laba besar tetapi kasnya tidak masuk karena penjualan kredit yang macet, dan bisnis seperti ini rapuh. Jebakan kedua adalah pertumbuhan EPS yang murni karena pembelian kembali saham, yang mengurangi jumlah saham tanpa laba bertambah; itu sah secara akuntansi tetapi bukan pertumbuhan bisnis. Jebakan ketiga adalah membandingkan EPS antar industri secara langsung; EPS bank dan EPS manufaktur punya struktur yang berbeda sehingga lebih tepat membandingkan pertumbuhannya masing-masing. Selalu baca EPS bersama arus kas operasi dan utang agar tidak terkejut saat laba bagus tiba-tiba berbalik."),
    ],
    articles: [
      { slug: "per-dan-pbv-cara-membaca-valuasi-saham", title: "PER dan PBV: Cara Membaca Valuasi Saham BEI" },
    ],
    example: { kind: "fundamental_top" },
  },

  ihsg: {
    sections: [
      D("Apa yang diukur IHSG", "Indeks Harga Saham Gabungan atau IHSG mengukur pergerakan nilai seluruh saham tercatat di Bursa Efek Indonesia, dihitung dari jumlah kapitalisasi pasar semua emiten dengan basis tertentu di tahun awal. Karena berbasis kapitalisasi, saham besar seperti bank raksasa punya bobot jauh lebih besar daripada saham kecil, sehingga IHSG naik tidak otomatis berarti saham Anda ikut naik. Di dunia praktik, IHSG berfungsi sebagai termometer suasana pasar: ketika hijau, umumnya lebih banyak saham naik dan sebaliknya. Investor memakainya untuk menilai konteks, misalnya menahan beli saat IHSG jatuh tajam, atau mencari saham kuat yang tertinggal saat IHSG naik."),
      D("Kenapa saham Anda bisa beda arah dengan IHSG", "Fenomena paling membingungkan pemula adalah IHSG naik tetapi portofolio merah. Penjelasannya ada pada struktur berbobot: segelintir saham berkapitalisasi raksasa bisa menarik indeks naik sendirian sementara mayoritas saham lain justru turun, kondisi yang sering disebut pasar sempit. Sebaliknya ketika IHSG turun karena satu sektor berat tertekan, saham sektor lain yang sehat bisa tetap naik. Rotasi sektor dan aliran dana asing juga membuat arah antar saham berbeda pada hari yang sama. Karena itu jadikan IHSG peta besar, tetapi keputusan beli-jual tetap berdasar analisis saham masing-masing."),
      D("Cara memakai IHSG dalam keputusan harian", "Praktik yang sehat adalah mengecek arah IHSG sebelum mengambil keputusan sebagai konteks risiko, bukan sebagai sinyal tunggal. Saat IHSG turun berhari-hari, peluang pantulan memang ada tetapi risiko tinggi, jadi ukuran posisi kecil lebih bijak. Saat IHSG naik beruntun, waspadai euforia dan jangan mengekar harga saham yang sudah jenuh. Yang perlu dihindari adalah menebak-nebak titik tertinggi atau terendah indeks; bahkan profesional pun lebih sering salah pada hal itu. Fokus pada proses yang bisa diulang: saring saham berfundamental sehat, tunggu harganya masuk akal, dan kelola risiko setiap posisi dengan disiplin, sambil menjadikan IHSG sekadar latar suasana pasar keseluruhan."),
    ],
    articles: [
      { slug: "ihsg-itu-apa-cara-menghitung-dan-kenapa-saham-anda-bisa-beda-arah", title: "IHSG Itu Apa? Cara Menghitung, Bobot Bank Besar, dan Kenapa Saham Anda Bisa Beda Arah" },
    ],
    example: { kind: "ihsg_snapshot" },
  },

  ipo: {
    sections: [
      D("Apa itu IPO dan tahapannya", "Initial Public Offering atau IPO adalah proses perusahaan pertama kali menjual sahamnya ke publik dan mencatatkan diri di bursa. Tujuannya bermacam-macam: menghimpun dana ekspansi, memberi jalan keluar bagi pemodal lama, atau sekadar membangun reputasi. Prosesnya panjang: perusahaan mengajukan pendaftaran ke otoritas bursa, menerbitkan prospektus yang berisi kondisi keuangan dan rencana penggunaan dana, lalu membuka masa pemesanan atau bookbuilding di mana calon investor menempatkan pesanan pada kisaran harga yang ditawarkan. Setelah harga final ditetapkan, saham dialokasikan dan mulai diperdagangkan di hari pertama atau listing day. Data tanggal pencatatan emiten baru tersedia resmi di bursa dan bisa dilihat pada layar emiten terbaru."),
      D("Peluang dan risiko di hari-hari awal", "Hari pertama perdagangan IPO sering menjadi perhatian karena harganya bisa melesat akibat permintaan yang menumpuk, tetapi bisa juga langsung turun di bawah harga penawaran. Aturan bursa seperti auto reject membatasi kenaikan harian sehingga aksi harga bisa berlangsung beberapa hari. Risiko khusus IPO adalah keterbatasan riwayat: tidak ada grafik bertahun-tahun untuk dianalisis, dan informasi hanya mengandalkan prospektus. Banyak IPO yang ramai di awal lalu kehilangan minat dan turun perlahan setelah keenam bulan berlalu, ketika pemegang saham awal akhirnya bebas menjual. Pemula sebaiknya memperlakukan IPO sebagai spekulasi berisiko tinggi dengan porsi sangat kecil, bukan investasi inti."),
      D("Cara menilai IPO sebelum ikut", "Baca prospektus dengan fokus pada tiga hal: kesehatan arus kas, struktur utang, dan kejelasan penggunaan dana. Waspadai perusahaan yang rajin membagi dividen besar menjelang IPO karena sering berarti mengambil kas keluar sebelum masuk bursa. Bandingkan valuasi penawaran dengan perusahaan sejenis yang sudah tercatat; IPO yang dihargai jauh lebih mahal dari peernet tanpa alasan jelas adalah red flag. Perhatikan pula rekam jejak pemegang saham pengendali dan penjamin emisi. Jika setelah listing harga langsung jatuh di bawah harga IPO dan terus turun, disiplin memotong rugi jauh lebih murah daripada berharap tanpa dasar. Mengamati beberapa IPO dari pinggir sebelum ikut adalah cara belajar yang murah."),
    ],
    articles: [
      { slug: "belajar-saham-dari-nol-panduan-langkah-demi-langkah-pemula", title: "Belajar Saham dari Nol: Panduan Langkah demi Langkah untuk Pemula" },
    ],
    example: { kind: "ipo_recent" },
  },

  lot: {
    sections: [
      D("Berapa isi satu lot dan kenapa penting", "Di Bursa Efek Indonesia, saham diperdagangkan dalam satuan lot yang berisi seratus lembar. Artinya transaksi terkecil adalah seratus saham sekaligus, bukan satu lembar. Konsekuensinya, modal minimum untuk membeli saham tertentu adalah harga per lembar dikali seratus, ditambah biaya transaksi. Saham seharga delapan ratus rupiah per lembarnya bisa dibeli dengan modal sekitar delapan puluh ribu rupiah per lot, sementara saham harga sembilan ribu rupiah membutuhkan sembilan ratus ribu rupiah per lot. Memahami hitungan ini penting agar rencana beli sesuai kantong dan tidak setengah jalan kehabisan dana."),
      D("Fraksi harga dan biaya yang jarang dihitung pemula", "Harga saham bergerak dalam fraksi yang ditetapkan bursa: kelipatan tertentu untuk rentang harga rendah dan kelipatan lebih besar untuk harga tinggi. Struktur ini memengaruhi seberapa halus harga bisa bergerak dan besarnya selisih bid-ask. Di sisi biaya, setiap beli dan jual dikenakan komisi broker dan pajak final atas keuntungan saat jual, jadi strategi yang terlalu sering keluar-masuk akan tergerus biaya. Untuk pemula dengan modal kecil, dua-tiga posisi yang dikelola baik biasanya mengalahkan sepuluh posisi yang tidak terpantau. Hitung selalu total modal per lot termasuk biaya sebelum menempatkan pesanan."),
      D("Strategi praktis dengan lot", "Karena seratus lembar adalah unit terkecil, pembagian posisi harus direncanakan dalam kelipatan lot: misalnya membeli separuh posisi dulu, lalu sisanya jika harga turun ke area yang diinginkan. Jangan mengejar saham mahal dengan modal terbatas sampai posisi jadi terlalu kecil untuk dikelola; pilih saham yang harganya masuk akal relatif modal agar pembagian lot tetap fleksibel. Perhatikan juga bahwa likuiditas berhubungan dengan fraksi: saham murah yang tipis perdagangannya bisa bergerak persen besar hanya dari selisih satu fraksi. Perhitungan sederhana sebelum menekan tombol beli, yaitu harga per lembar dikali seratus dikali jumlah lot yang diinginkan ditambah estimasi biaya broker, adalah kebiasaan kecil yang telah menyelamatkan banyak pemula dari kesalahan pesanan yang merugikan."),
    ],
    articles: [
      { slug: "1-lot-saham-berapa-lembar-modal-fraksi-dan-biaya-transaksi", title: "1 Lot Saham Itu Berapa Lembar? Hitung Modal, Fraksi Harga, dan Biaya Transaksinya" },
    ],
    example: { kind: "lot_math" },
  },

  "market-cap": {
    sections: [
      D("Cara menghitung dan membaca market cap", "Market capitalization atau kapitalisasi pasar adalah harga saham dikali jumlah seluruh saham beredar. Angka ini menunjukkan berapa nilai keseluruhan perusahaan menurut pasar saat ini, dan menjadi ukuran dasar untuk menggolongkan saham besar, menengah, atau kecil. Perusahaan dengan kapitalisasi ratusan triliunan rupiah adalah para raksasa yang gerakannya menggerakkan indeks, sementara kapitalisasi ratusan miliar adalah saham kecil yang pergerakannya lincah tetapi lebih berisiko. Market cap berubah setiap hari mengikuti harga; saat harga naik sepuluh persen, market cap pun naik sepuluh persen asalkan jumlah saham beredar tidak berubah. Data kapitalisasi saham-saham terbesar bisa dilihat pada layar valuasi pasar saat ini."),
      D("Market cap vs nilai buku vs harga wajar", "Kapitalisasi pasar adalah harga yang disepakati pasar hari ini, sedangkan nilai buku adalah nilai akuntansi ekuitas perusahaan menurut laporan keuangannya. Harga pasar bisa jauh lebih tinggi dari nilai buku ketika pasar percaya pertumbuhan perusahaan besar, dan bisa lebih rendah ketika masa depannya diragukan. Rasio harga terhadap nilai buku, yang dikenal sebagai PBV, menjadi alat cepat untuk melihat seberapa mahal saham relatif terhadap asetnya. Perusahaan berbasis aset berat seperti bank dan properti biasanya dinilai dekat nilai bukunya, sementara perusahaan teknologi atau konsumer kuat bisa bertransaksi berkali-kali lipat nilai buku. Tidak ada satu angka yang paling benar; keduanya saling melengkapi."),
      D("Kegunaan praktis bagi investor", "Ukuran kapitalisasi menentukan karakter investasi: saham mega cap cenderung stabil dan likuid, small cap berpotensi tumbuh cepat tetapi volatil dan kadang sulit keluar saat dibutuhkan. Bagi pemula, membatasi diri pada saham berkapitalisasi besar mengurangi risiko terjebak saham yang tidak ada pembelinya. Kapitalisasi juga menentukan bobot dalam indeks, yang menjelaskan kenapa isu besar selalu menggerakkan IHSG. Saat membandingkan dua perusahaan, bandingkan dalam rasio seperti PER dan PBV daripada harga per lembar, karena harga lembar bisa sama sementara ukuran perusahaannya jauh berbeda. Terakhir, jumlah saham beredar bisa berubah oleh right issue atau buyback, jadi cek perubahannya secara berkala."),
    ],
    articles: [
      { slug: "per-dan-pbv-cara-membaca-valuasi-saham", title: "PER dan PBV: Cara Membaca Valuasi Saham BEI" },
    ],
    example: { kind: "fundamental_top" },
  },

  pbv: {
    sections: [
      D("Cara membaca PBV", "Price to Book Value atau PBV membandingkan harga saham dengan nilai buku per lembarnya, yaitu ekuitas perusahaan dibagi jumlah saham beredar. PBV satu berarti Anda membayar tepat nilai aset bersih perusahaan menurut akuntansi; di bawah satu berarti membayar lebih murah dari nilai bukunya, dan di atas satu berarti membayar premi atas aset tersebut. PBV paling bermakna untuk perusahaan yang bisnisnya bertumpu pada aset dan modal seperti bank, finansial, dan properti. Untuk perusahaan yang kekuatannya pada merek atau teknologi, PBV bisa tinggi terus selama bertahun-tahun dan bukan berarti mahal. Seperti rasio lain, PBV paling informatif ketika dibandingkan dengan rata-rata historis perusahaan itu sendiri dan dengan peer sektornya."),
      D("PBV rendah: murah atau jebakan", "PBV di bawah satu sering dijuluki murah, tetapi ada dua kemungkinan yang sangat berbeda: pasar salah harga, atau memang ada masalah yang membuat asetnya diragukan nilainya. Yang perlu diperiksa adalah kualitas asetnya, misalnya pinjaman macet pada bank atau persediaan usang pada manufaktur, dan apakah perusahaan masih mencetak laba. Perusahaan yang terus merugi akan menggerus nilai bukunya sendiri sehingga PBV murah hari ini bisa tetap mahal besok. Sebaliknya perusahaan dengan laba stabil dan PBV di bawah satu berkat sentimen pasar sesaat sering menjadi peluang nilai klasik. Bedakan keduanya dengan membaca tren laba, bukan hanya satu angka PBV."),
      D("Kesalahan umum memakai PBV", "Kesalahan pertama adalah membandingkan PBV lintas sektor secara langsung; bank dengan PBV satu dan perusahaan konsumer dengan PBV lima tidak otomatis berarti bank lebih murah. Kesalahan kedua adalah mengabaikan perubahan jumlah saham: right issue mengubah ekuitas dan jumlah saham sekaligus sehingga PBV historis harus dibaca dengan konteks. Kesalahan ketiga adalah memakai nilai buku yang usang ketika perusahaan baru saja menambah atau menghapus aset besar. Gunakan PBV berdampingan dengan PER dan profitabilitas seperti return on equity: PBV rendah dengan profitabilitas tinggi jauh lebih menarik daripada PBV rendah dengan perusahaan terus rugi. Layar screener yang menggabungkan beberapa ratio seperti itu membantu menemukan kandidat secara objektif."),
    ],
    articles: [
      { slug: "per-dan-pbv-cara-membaca-valuasi-saham", title: "PER dan PBV: Cara Membaca Valuasi Saham BEI" },
    ],
    example: { kind: "fundamental_top" },
  },

  per: {
    sections: [
      D("Cara membaca PER", "Price to Earnings Ratio atau PER adalah harga saham dibagi laba per saham setahun. Angka ini menjawab pertanyaan sederhana: berapa tahun kira-kira laba perusahaan harus dikumpulkan agar setara dengan harga yang Anda bayar. PER sepuluh berarti pasar menghargai perusahaan sepuluh kali laba tahunannya. PER tinggi biasanya berarti pasar mengharapkan pertumbuhan laba besar di masa depan, sedangkan PER rendah bisa berarti murah atau memang masa depannya suram. Karena berbasis laba akuntansi, PER bisa terdistorsi oleh laba sekali saja atau kerugian luar biasa, jadi banyak analis memakai laba berjalan yang dinormalisasi. Perusahaan rugi tidak punya PER yang berarti sehingga rasio ini tidak bisa dipakai untuk mereka."),
      D("Membandingkan PER dengan benar", "PER paling adil dibandingkan dalam industri yang sama, karena setiap sektor punya struktur laba dan siklus berbeda: bank dinilai lebih rendah, teknologi dan konsumer premium biasanya lebih tinggi. Bandingkan juga dengan rata-rata historis perusahaan sendiri untuk menangkap siklusnya; PER yang selalu diperdagangkan di kisaran delapan sampai dua belas berada di puncak ketika menyentuh dua belas. PER forward yang memakai proyeksi laba tahun depan lebih berguna untuk perusahaan yang labanya sedang berubah cepat, tetapi ingat proyeksi bisa meleset. Jangan lupa cek kualitas laba lewat arus kas operasi agar PER murah tidak menipu. Layar screener valuasi dapat mempercepat penyaringan awal sebelum analisis manual mendalam."),
      D("Jebakan PER murah", "PER sangat rendah sering menjadi value trap: laba tahun lalu memang tinggi tetapi bisnisnya sedang menurun, sehingga laba tahun depan jauh lebih kecil dan PER murah hari ini menjadi mahal nanti. Perusahaan siklis seperti komoditas terlihat paling murah justru di puncak siklus ketika labanya memuncak, dan terlihat mahal di dasar siklus ketika labanya tertekan. Ini kebalikan intuisi pemula sehingga banyak yang terjebak membeli komoditas di puncak. Aturan praktis: gabungkan PER dengan arah laba beberapa kuartal terakhir dan posisi dalam siklus industri. PER adalah alat awal yang bagus untuk menyaring, tetapi keputusan akhir selalu butuh konteks bisnis di balik angkanya."),
    ],
    articles: [
      { slug: "per-dan-pbv-cara-membaca-valuasi-saham", title: "PER dan PBV: Cara Membaca Valuasi Saham BEI" },
    ],
    example: { kind: "fundamental_top" },
  },

  saham: {
    sections: [
      D("Apa sebenarnya yang Anda miliki", "Saham adalah bukti kepemilikan bagian dari perusahaan, bukan sekadar tiket berharga di layar aplikasi. Pemegang saham berhak atas bagian laba yang dibagikan sebagai dividen, berhak suara dalam rapat umum pemegang saham, dan berhak atas sisa aset bila perusahaan dilikuidasi. Uang yang Anda bayar saat membeli saham lama di pasar tidak masuk ke kas perusahaan, melainkan berpindah ke penjual sesama investor; perusahaan mendapat dana segar hanya saat penerbitan awal seperti IPO atau right issue. Memahami hal ini mengubah cara memandang saham: yang Anda beli adalah klaim atas aliran laba bisnis nyata di masa depan, dan harganya akan mengikuti nasib bisnis itu dalam jangka panjang."),
      D("Dua sumber keuntungan dan karakter risikonya", "Keuntungan dari saham datang dari dua jalur: capital gain ketika harga naik di atas harga beli, dan dividen sebagai bagian laba yang dibagikan. Keduanya punya karakter berbeda; capital gain tidak pasti dan bergantung suasana pasar, sedangkan dividen dari perusahaan stabil lebih mudah diprediksi dan cocok untuk kebutuhan arus kas. Risiko saham juga dua lapis: risiko bisnis ketika perusahaan benar-benar memburuk, dan risiko harga ketika pasar panik meski bisnis tetap sehat. Pemula yang paham bedanya tidak mudah panik menjual saham bagus hanya karena harga turun, dan tidak juga bertahan pada saham yang bisnisnya rusak hanya karena harapan. Diversifikasi antar sektor mengurangi dampak satu perusahaan yang gagal."),
      D("Langkah praktis memulai", "Mulailah dengan dana dingin yang tidak dibutuhkan dalam satu dua tahun, karena pasar bisa turun lama dan Anda tidak mau terpaksa menjual di dasar. Buka rekening efek di broker resmi, pelajari cara membaca laporan keuangan sederhana seperti laba, utang, dan arus kas, lalu mulai dari perusahaan besar yang produknya Anda kenal sehari-hari. Biasakan menulis rencana sebelum membeli: alasan masuk, target, dan batas kerugian. Pantau hasilnya secara kuartalan, bukan jam-an, karena noise harga harian lebih sering merusak keputusan daripada membantunya. Materi belajar saham dari nol yang disusun bertahap tersedia di akademi untuk memandu langkah demi langkah."),
    ],
    articles: [
      { slug: "belajar-saham-dari-nol-panduan-langkah-demi-langkah-pemula", title: "Belajar Saham dari Nol: Panduan Langkah demi Langkah untuk Pemula" },
      { slug: "cara-mengelola-risiko-dalam-investasi-saham", title: "Cara Mengelola Risiko dalam Investasi Saham" },
    ],
    example: { kind: "ihsg_snapshot" },
  },
};

/** Depth gate: istilah lolos sitemap hanya bila punya deep-dive lengkap.
 *  (seo-dr-2 verdict tetap utk 45 istilah lain — re-entry selektif, bukan massal.) */
export function passesDepthGate(term: { slug: string }): boolean {
  return GLOSSARY_DEEP_DIVES[term.slug] !== undefined;
}
