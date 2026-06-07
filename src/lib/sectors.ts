export interface Sector {
  slug: string;
  name: string;
  description: string;
  stocks: string[];
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
    stocks: ["ASRI", "CPIN", "ERAA", "GZCO"],
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
];
