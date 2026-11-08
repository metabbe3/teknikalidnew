export interface Sector {
  slug: string;
  name: string;
  description: string;
  stocks: string[];
}

/** Map English IDX sector names to TeknikalID sector slugs */
export const SECTOR_SLUG_MAP: Record<string, string> = {
  "Financials": "perbankan",
  "Energy": "energi",
  "Consumer Cyclicals": "perdagangan",
  "Consumer Non-Cyclicals": "konsumer",
  "Basic Materials": "industri-dasar",
  "Healthcare": "kesehatan",
  "Industrials": "industri",
  "Infrastructures": "infrastruktur",
  "Properties & Real Estate": "properti",
  "Technology": "teknologi",
  "Transportation & Logistics": "transportasi",
};

/** Metadata landing sektor (prd-2026-11-06-02) — 11 slug DB-backed.
 *  en = nama sektor persis kolom Stock.sector (key snapshot marketEngine);
 *  name = label ID halaman; description = copy SEO >=120 kata, unik antar sektor.
 *  Sumber kebenaran slug = SECTOR_SLUG_MAP; SECTOR_META wajib 1:1 dengannya
 *  (dijaga selftest sector-landing A4). */
export interface SectorMeta {
  slug: string;
  en: string;
  name: string;
  description: string;
}

export const SECTOR_META: SectorMeta[] = [
  {
    slug: "perbankan",
    en: "Financials",
    name: "Perbankan & Keuangan",
    description:
      "Sektor perbankan dan keuangan adalah pilar indeks IHSG dengan kapitalisasi pasar terbesar di Bursa Efek Indonesia. Saham perbankan seperti BBCA, BBRI, BMRI, dan BBNI menjadi barometer arah pasar karena bobotnya yang dominan dalam indeks. Pergerakan sektor ini sangat dipengaruhi suku bunga acuan Bank Indonesia, pertumbuhan kredit, kualitas aset (NPL), dan margin net interest margin para bank. Halaman ini merangkum pergerakan harga seluruh saham sektor keuangan hari ini lengkap dengan skor sinyal teknikal, mulai dari bank big-cap hingga multifinance, sehingga Anda bisa melihat sekaligus mana emiten yang sedang menguat atau menekan indeks. Klik setiap saham untuk membuka analisa teknikal mendalam berisi RSI, MACD, posisi harga terhadap moving average, dan rekomendasi sinyal jual-beli terbaru berdasarkan data harga resmi bursa. Pantau pula breadth sektor di bawah untuk melihat proporsi saham bank yang naik versus turun hari ini.",
  },
  {
    slug: "energi",
    en: "Energy",
    name: "Energi",
    description:
      "Sektor energi di Bursa Efek Indonesia mencakup emiten batu bara, migas, dan jasa energi seperti ADRO, PTBA, ITMG, MEDC, dan PGAS. Saham energi sering menjadi penggerak utama IHSG ketika harga komoditas global naik, karena mayoritas pendapatan emiten batu bara berasal dari ekspor dengan kontrak dolar. Faktor penggerak utama sektor ini adalah harga batu bara Newcastle, harga minyak Brent, kebijakan DMO pemerintah, serta permintaan energi dari India dan China. Di halaman ini Anda dapat memantau pergerakan seluruh saham energi hari ini dalam satu tabel berisi persentase perubahan harga dan skor sinyal teknikal, membantu mengidentifikasi apakah momentum sektor sedang bullish atau justru mengalami tekanan jual. Telusuri halaman analisa tiap saham untuk melihat support-resistance dan rencana trading yang lebih rinci berdasarkan metode teknikal yang konsisten. Bandingkan pula breadth sektor di bawah untuk menilai apakah kenaikan hanya dipicu beberapa emiten atau merata di seluruh sektor.",
  },
  {
    slug: "perdagangan",
    en: "Consumer Cyclicals",
    name: "Perdagangan & Ritel",
    description:
      "Sektor perdagangan dan konsumen siklis mencakup emiten ritel, distribusi, media, apparel, hingga jasa perjalanan seperti ERAA, MAPA, RALS, MPMX, dan PZZA. Saham sektor ini sensitif terhadap daya beli masyarakat, musim liburan, dan tren konsumsi generasi muda, sehingga pergerakannya sering lebih volatile dibanding kebutuhan pokok. Emiten ritel besar mendapat perhatian saat laporan penjualan kuartalan dirilis, sementara emiten apparel dan perjalanan bergerak mengikuti musim dan momentum gaya hidup. Halaman ini menampilkan peta pergerakan seluruh saham perdagangan hari ini beserta skor sinyal teknikal dari indikator seperti RSI dan MACD, sehingga Anda bisa cepat melihat emiten mana yang sedang breakout dan mana yang justru menembus support. Buka halaman tiap saham untuk analisa lengkap dengan grafik harga dan riwayat sinyal. Bandingkan pula breadth sektor di bawah untuk menilai apakah kenaikan hanya dipicu beberapa emiten besar atau justru merata, dan ingat arah sektor ritel sering mendahului data penjualan kuartalan yang rilis beberapa minggu kemudian.",
  },
  {
    slug: "konsumer",
    en: "Consumer Non-Cyclicals",
    name: "Barang Konsumsi",
    description:
      "Sektor barang konsumsi non-siklis atau kebutuhan pokok dihuni emiten legendaris pasar Indonesia seperti ICBP, INDF, GGRM, UNVR, MYOR, hingga CPIN dan JPFA di sisi agrikultur pakan ternak. Saham sektor ini dikenal defensif karena permintaan produk makanan, rokok, dan kebutuhan harian relatif stabil terlepas dari siklus ekonomi, sehingga sering menjadi pelarian investor saat pasar sedang bergejolak. Katalis utama sektor adalah daya beli masyarakat, harga komoditas bahan baku seperti gandum dan CPO, serta kemampuan emiten menaikkan harga jual tanpa kehilangan volume. Di sini Anda bisa melihat pergerakan seluruh saham konsumer hari ini lengkap dengan skor sinyal teknikal, breadth sektor, dan daftar saham dengan sinyal terkuat untuk ditelusuri lebih dalam melalui halaman analisa teknikal masing-masing emiten. Perhatikan juga angka breadth sektor di bawah sebagai indikasi kekuatan pergerakan yang merata atau hanya dipicu saham big-cap tertentu.",
  },
  {
    slug: "industri-dasar",
    en: "Basic Materials",
    name: "Bahan Dasar",
    description:
      "Sektor bahan dasar merupakan rumah bagi emiten semen, pulp and paper, petrokimia, logam, dan kimia seperti INTP, SMGR, INKP, TKIM, BRPT, TPIA, dan ANTM. Dengan lebih dari seratus emiten tercatat, sektor bahan dasar adalah salah satu sektor terbesar di BEI dan penggerak signifikan arah IHSG. Pergerakannya mengikuti harga komoditas global seperti semen, kertas, nikel, dan produk petrokimia, serta siklus pembangunan infrastruktur dalam negeri yang menyerap semen dan baja. Halaman ini menggabungkan pergerakan harga seluruh saham bahan dasar hari ini dengan skor sinyal teknikal dan breadth sektor, memberi gambaran cepat apakah sektor sedang dalam fase akumulasi atau distribusi. Klik saham mana pun untuk melihat analisa teknikal lengkap berisi indikator, riwayat sinyal, dan konten edukasi terkait. Gunakan breadth sektor di bawah untuk menilai partisipasi luas atau sempit dari pergerakan harga bahan dasar hari ini.",
  },
  {
    slug: "kesehatan",
    en: "Healthcare",
    name: "Kesehatan",
    description:
      "Sektor kesehatan Bursa Efek Indonesia dihuni produsen farmasi, operator rumah sakit, dan distributor alat kesehatan seperti KLBF, SIDO, KAEF, MIKA, HEAL, dan SILO. Saham kesehatan bersifat defensif karena permintaan obat dan layanan medis tidak terpengaruh siklus ekonomi, dengan katalis struktural berupa program jaminan kesehatan BPJS, pertambahan populasi lansia, dan ekspansi jaringan rumah sakit ke kota kelas dua. Pergerakan harian sektor cenderung lebih tenang dibanding sektor siklis, namun tetap menghasilkan peluang trading pada saham farmasi yang sensitif berita regulasi obat. Halaman ini menyajikan peta pergerakan seluruh saham kesehatan hari ini beserta skor sinyal teknikal dan daftar emiten dengan momentum terkuat, dan setiap baris tertaut ke analisa teknikal mendalam untuk mendukung keputusan jual-beli Anda. Lihat pula breadth sektor di bawah untuk mengetahui seberapa merata pergerakan naik dibanding turun di seluruh emiten kesehatan hari ini.",
  },
  {
    slug: "industri",
    en: "Industrials",
    name: "Industri",
    description:
      "Sektor industri di BEI mencakup emiten konstruksi, jasa industri, mesin, otomotif dan komponennya, serta kabel seperti WIKA, WSKT, PTPP, UNTR, and BREN. Saham industri sangat bergantung pada belanja pemerintah untuk proyek infrastruktur, siklus penggantian alat berat pertambangan, dan momentum industriisasi hilirisasi nikel serta baterai. Saham konstruksi cenderung bergerak cepat saat anggaran proyek dilepas, sementara emiten alat berat mengikuti aktivitas pertambangan dan harga komoditas. Halaman ini merangkum pergerakan seluruh saham industri hari ini dalam satu tampilan dengan skor sinyal teknikal, sehingga Anda dapat menilai apakah sektor sedang didukung momentum beli atau jual. Telusuri halaman analisa tiap emiten untuk melihat detail indikator RSI, MACD, dan rencana trading berbasis data harga resmi bursa. Cek breadth sektor di bawah untuk memastikan pergerakan hari ini ditopang banyak emiten, bukan hanya satu-dua saham berkapitalisasi besar.",
  },
  {
    slug: "infrastruktur",
    en: "Infrastructures",
    name: "Infrastruktur & Telekomunikasi",
    description:
      "Sektor infrastruktur mencakup telekomunikasi, menara telekom, listrik, jalan tol, dan pelabuhan dengan nama-nama besar seperti TLKM, ISAT, EXCL, TOWR, JSMR, dan POWR. Saham infrastruktur dikenal dengan dividen menggiurkan dan arus kas stabil karena pendapatannya berbasis langganan dan kontrak jangka panjang, menjadikannya favori investor institusi dan strategi income investing. Katalis sektor ini adalah penetrasi data seluler dan fiber, kebijakan tarif telekomunikasi, ekspansi 5G, serta proyek strategis nasional di jalan tol dan energi terbarukan. Halaman ini menampilkan pergerakan seluruh saham infrastruktur hari ini lengkap dengan breadth sektor dan skor sinyal teknikal tiap emiten, memudahkan Anda menemukan saham dengan momentum harga terbaik sebelum membaca analisa teknikal lengkapnya di halaman masing-masing. Amati pula breadth sektor di bawah guna mengukur partisipasi seluruh emiten infrastruktur dalam pergerakan pasar hari ini. Untuk strategi jangka panjang, kalender ex-date dividen emiten infrastruktur juga bisa dicek dari halaman kalender dividen teknikal.id.",
  },
  {
    slug: "properti",
    en: "Properties & Real Estate",
    name: "Properti",
    description:
      "Sektor properti dan real estate Bursa Efek Indonesia dihuni pengembang hunian, kawasan industri, dan perkantoran seperti BSDE, CTRA, SMRA, PWON, ASRI, dan KIJA. Saham properti bergerak mengikuti siklus suku bunga Bank Indonesia karena ketersediaan kredit kepemilikan rumah adalah bahan bakar utama penjualan pengembang, ditambah faktor kepercayaan konsumen dan program subsidi perumahan pemerintah. Setelah masa sulit pasca kenaikan suku bunga, sektor ini kerap memberikan rebound tajam saat siklus bunga berbalik turun. Halaman ini menyatukan pergerakan harga seluruh saham properti hari ini dengan skor sinyal teknikal dan breadth sektor, memberi pandangan cepat atas kesehatan sektor. Klik tiap saham untuk analisa teknikal mendalam berisi level support-resistance dan riwayat sinyal jual-beli dari mesin analisa teknikal.id. Breadth sektor di bawah membantu Anda menilai apakah penguatan atau pelemahan hari ini terjadi merata di seluruh pengembang properti.",
  },
  {
    slug: "teknologi",
    en: "Technology",
    name: "Teknologi",
    description:
      "Sektor teknologi BEI berisi emiten digital, e-commerce, fintech, dan layanan cloud seperti BUKA, EMTK, MTDL, DCII, dan GOTO. Saham teknologi menawarkan cerita pertumbuhan tertinggi di bursa dengan valuasi berbasis proyeksi laba jangka panjang, sehingga harganya volatile dan sangat sensitif terhadap laporan kuartalan pertumbuhan pengguna, pendapatan, serta arus kas. Pergerakan sektor ini juga mengikuti sentimen pasar teknologi global seperti Nasdaq dan berita ekosistem digital Indonesia. Bagi trader, volatilitas tinggi berarti peluang besar sekaligus risiko besar, sehingga sinyal teknikal disiplin menjadi penting. Halaman ini menampilkan pergerakan seluruh saham teknologi hari ini beserta skor sinyal dan breadth sektor agar Anda bisa menangkap momentum secara cepat, dengan tautan ke analisa teknikal lengkap untuk setiap emiten sebelum memutuskan entry. Breadth sektor di bawah menunjukkan seberapa banyak saham teknologi yang bergerak searah, sinyal penting bagi strategi momentum.",
  },
  {
    slug: "transportasi",
    en: "Transportation & Logistics",
    name: "Transportasi & Logistik",
    description:
      "Sektor transportasi dan logistik mencakup maskapai penerbangan, operator pelabuhan, ekspedisi, dan angkutan darat seperti BIRD, ASSA, SMDR, IPCC, dan TMAS. Saham transportasi adalah proxy pembukaan ekonomi dan perdagangan: maskapai mengikuti volume penumpang dan harga avtur, operator pelabuhan mengikuti volume ekspor-impor, sementara ekspedisi meraup manfaat dari lonjakan logistik e-commerce. Sektor ini relatif kecil dengan sekitar empat puluh emiten, namun sering menghasilkan pergerakan harga tajam saat berita katalis datang. Halaman ini merangkum pergerakan seluruh saham transportasi hari ini dalam satu tabel berisi persentase perubahan dan skor sinyal teknikal, memudahkan Anda menilai arah sektor secepatnya. Setiap baris tertaut ke halaman analisa teknikal lengkap dengan indikator dan riwayat sinyal yang terupdate setiap sesi. Jangan lewatkan breadth sektor di bawah untuk menilai apakah pergerakan tajam hari ini melibatkan mayoritas emiten transportasi.",
  },
];

/** Get sector slug from English sector name */
export function getSectorSlug(englishSector: string): string {
  return SECTOR_SLUG_MAP[englishSector] ?? "";
}

/** Map English GICS/IDX sector names to Bahasa Indonesia display labels. */
const SECTOR_NAME_ID: Record<string, string> = {
  "Financials": "Keuangan",
  "Energy": "Energi",
  "Consumer Cyclicals": "Konsumen Siklis",
  "Consumer Cyclical": "Konsumen Siklis",
  "Consumer Non-Cyclicals": "Konsumen Non-Siklis",
  "Consumer Defensive": "Konsumen Defensif",
  "Basic Materials": "Bahan Dasar",
  "Healthcare": "Kesehatan",
  "Industrials": "Industri",
  "Infrastructures": "Infrastruktur",
  "Properties & Real Estate": "Properti",
  "Real Estate": "Properti",
  "Technology": "Teknologi",
  "Communication Services": "Layanan Komunikasi",
  "Utilities": "Utilitas",
  "Transportation & Logistics": "Transportasi & Logistik",
};

/** Bahasa Indonesia display label for a sector; falls back to the input. */
export function sectorToBahasa(sector: string | null | undefined): string {
  if (!sector) return "";
  return SECTOR_NAME_ID[sector] ?? sector;
}

export const SECTORS: Sector[] = [
  {
    slug: "perbankan",
    name: "Perbankan",
    description:
      "Sektor perbankan mencakup bank-bank besar yang tercatat di Bursa Efek Indonesia (BEI). Saham perbankan seperti BBCA, BBRI, dan BMRI merupakan pilar utama indeks IHSG dengan kapitalisasi pasar terbesar. Pantau analisis teknikal saham perbankan untuk mendeteksi tren harga, support-resistance, dan sinyal jual-beli terkini.",
    stocks: ["BBCA", "BBRI", "BMRI", "BBNI", "BRIS"],
  },
  {
    slug: "pertambangan",
    name: "Pertambangan",
    description:
      "Sektor pertambangan di BEI meliputi perusahaan tambang nikel, emas, timah, dan mineral lainnya. Saham pertambangan seperti ANTM dan INCO sangat dipengaruhi harga komoditas global. Analisis teknikal saham pertambangan membantu investor mengidentifikasi momentum harga dan titik masuk-keluar yang optimal.",
    stocks: ["ANTM", "INCO", "MDKA", "TINS"],
  },
  {
    slug: "perdagangan",
    name: "Perdagangan",
    description:
      "Sektor perdagangan mencakup perusahaan retail, distribusi, dan perdagangan umum di Indonesia. Emiten seperti CPIN dan ERAA memiliki peran penting dalam ekosistem konsumsi dalam negeri. Gunakan analisis teknikal untuk memantau pergerakan harga saham perdagangan secara real-time.",
    stocks: ["ASRI", "CPIN", "ERAA", "GZCO", "HRTA"],
  },
  {
    slug: "agrikultur",
    name: "Agrikultur",
    description:
      "Sektor agrikultur BEI terdiri dari perusahaan perkebunan kelapa sawit, karet, dan komoditas pertanian lainnya. Saham agrikultur seperti AALI dan SMAR dipengaruhi harga CPO global dan kondisi cuaya. Pantau chart teknikal saham agrikultur untuk strategi trading yang lebih terukur.",
    stocks: ["AALI", "LSIP", "JAAF", "SMAR"],
  },
  {
    slug: "industri-dasar",
    name: "Industri Dasar",
    description:
      "Sektor industri dasar mencakup perusahaan pulp & paper, semen, dan bahan bangunan yang terdaftar di BEI. Emiten seperti KRAS dan INKP berperan vital dalam pembangunan infrastruktur Indonesia. Analisis indikator teknikal RSI, MACD, dan Bollinger Bands untuk saham industri dasar.",
    stocks: ["KRAS", "INKP", "TKIM"],
  },
  {
    slug: "properti",
    name: "Properti",
    description:
      "Sektor properti di BEI meliputi pengembang real estate dan perusahaan properti besar Indonesia. Saham properti seperti BSDE dan CTRA mengikuti siklus ekonomi dan suku bunga Bank Indonesia. Cek analisis teknikal saham properti untuk melihat tren harga dan sinyal trading terbaru.",
    stocks: ["BSDE", "CTRA", "SMRA", "BLTA"],
  },
  {
    slug: "infrastruktur",
    name: "Infrastruktur",
    description:
      "Sektor infrastruktur mencakup perusahaan telekomunikasi, tower, dan utilitas yang tercatat di BEI. Saham infrastruktur seperti TLKM dan TOWR menawarkan stabilitas dividen dan pertumbuhan jangka panjang. Pantau chart dan indikator teknikal saham infrastruktur di TeknikalID.",
    stocks: ["TLKM", "TOWR", "EXCL"],
  },
  {
    slug: "transportasi",
    name: "Transportasi",
    description:
      "Sektor transportasi BEI meliputi maskapai, logistik, dan jasa angkutan darat. Saham transportasi seperti BIRD dan ASSA dipengaruhi volume penumpang, harga BBM, dan tren pariwisata. Analisis teknikal saham transportasi membantu mengidentifikasi peluang trading jangka pendek dan menengah.",
    stocks: ["BIRD", "ASSA"],
  },
  {
    slug: "teknologi",
    name: "Teknologi",
    description:
      "Sektor teknologi di BEI mencakup perusahaan e-commerce, digital, dan media yang berkembang pesat. Saham teknologi seperti EMTK dan BUKA memiliki volatilitas tinggi dengan potensi pertumbuhan besar. Gunakan indikator teknikal untuk memantau momentum saham teknologi secara akurat.",
    stocks: ["EMTK", "BUKA", "DCII"],
  },
  {
    slug: "jasa",
    name: "Jasa",
    description:
      "Sektor jasa di BEI meliputi perusahaan multifinance, consumer goods, dan jasa keuangan lainnya. Emiten seperti MFIN dan CPIN memiliki peran penting dalam perekonomian Indonesia. Pantau analisis teknikal saham jasa untuk menemukan titik support dan resistance terkini.",
    stocks: ["BBNI", "MFIN", "CPIN"],
  },
  {
    slug: "konsumer",
    name: "Konsumer",
    description:
      "Sektor konsumer BEI terdiri dari perusahaan consumer goods, rokok, dan makanan-minuman besar Indonesia. Saham konsumer seperti ICBP, INDF, dan GGRM relatif defensif di tengah ketidakpastian pasar. Cek analisis teknikal lengkap saham konsumer termasuk sinyal buy-sell di TeknikalID.",
    stocks: ["ICBP", "INDF", "GGRM", "UNVR"],
  },
  {
    slug: "kesehatan",
    name: "Kesehatan",
    description:
      "Sektor kesehatan di BEI meliputi industri farmasi, rumah sakit, dan alat kesehatan seperti KLBF, MIKA, HEAL, dan SILO. Pantau analisis teknikal saham kesehatan untuk mengidentifikasi momentum harga dan level support-resistance kunci.",
    stocks: ["KLBF", "MIKA", "HEAL", "SILO"],
  },
];
