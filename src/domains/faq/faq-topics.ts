export interface FAQTopic {
  question: string;
  category: string;
  format: "FAQ" | "MINI_ARTICLE";
}

export interface FAQTopicCategory {
  id: string;
  label: string;
  topics: FAQTopic[];
}

export const FAQ_TOPIC_CATEGORIES: FAQTopicCategory[] = [
  // ─── INDIKATOR TEKNIKAL ───
  {
    id: "indikator",
    label: "Indikator Teknikal",
    topics: [
      { question: "Apa itu RSI (Relative Strength Index)?", category: "indikator", format: "FAQ" },
      { question: "Bagaimana cara membaca MACD?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Bollinger Bands dan cara menggunakannya?", category: "indikator", format: "MINI_ARTICLE" },
      { question: "Apa perbedaan SMA dan EMA?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Stochastic Oscillator?", category: "indikator", format: "FAQ" },
      { question: "Apa itu ADX dan cara mengukur kekuatan tren?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Supertrend?", category: "indikator", format: "FAQ" },
      { question: "Bagaimana cara membaca volume perdagangan saham?", category: "indikator", format: "FAQ" },
      { question: "Apa itu OBV (On-Balance Volume)?", category: "indikator", format: "FAQ" },
      { question: "Apa itu VWAP dan kenapa penting?", category: "indikator", format: "FAQ" },
      { question: "Apa itu ATR (Average True Range)?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Golden Cross dan Death Cross?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Support dan Resistance?", category: "indikator", format: "MINI_ARTICLE" },
      { question: "Bagaimana cara menggunakan Fibonacci Retracement?", category: "indikator", format: "MINI_ARTICLE" },
      { question: "Apa itu Ichimoku Cloud (Kumo)?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Parabolic SAR?", category: "indikator", format: "FAQ" },
      { question: "Bagaimana cara membaca Pivot Point?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Williams %R?", category: "indikator", format: "FAQ" },
      { question: "Apa itu CCI (Commodity Channel Index)?", category: "indikator", format: "FAQ" },
      { question: "Apa itu Volume Weighted Average Price (VWAP) intraday?", category: "indikator", format: "FAQ" },
      { question: "Bagaimana cara membaca RSI divergensi bearish dan bullish?", category: "indikator", format: "MINI_ARTICLE" },
      { question: "Apa itu Money Flow Index (MFI)?", category: "indikator", format: "FAQ" },
      { question: "Apa perbedaan leading dan lagging indicator?", category: "indikator", format: "FAQ" },
    ],
  },

  // ─── SAHAM & PASAR ───
  {
    id: "saham",
    label: "Saham & Pasar",
    topics: [
      { question: "Apa itu LQ45 dan IDX40?", category: "saham", format: "FAQ" },
      { question: "Apa perbedaan saham blue chip dan gorengan?", category: "saham", format: "FAQ" },
      { question: "Bagaimana cara memilih saham untuk pemula?", category: "saham", format: "MINI_ARTICLE" },
      { question: "Apa itu bandarmologi?", category: "saham", format: "FAQ" },
      { question: "Apa itu auto rejection (ARA/ARB)?", category: "saham", format: "FAQ" },
      { question: "Apa itu dividen saham?", category: "saham", format: "FAQ" },
      { question: "Apa itu rights issue dan stock split?", category: "saham", format: "FAQ" },
      { question: "Apa itu IPO dan cara ikut IPO?", category: "saham", format: "FAQ" },
      { question: "Berapa modal minimal untuk mulai investasi saham?", category: "saham", format: "FAQ" },
      { question: "Apa perbedaan investor dan trader?", category: "saham", format: "FAQ" },
      { question: "Apa itu BEI (Bursa Efek Indonesia)?", category: "saham", format: "FAQ" },
      { question: "Apa itu indeks saham IHSG?", category: "saham", format: "FAQ" },
      { question: "Apa itu saham treasury (treasury stock)?", category: "saham", format: "FAQ" },
      { question: "Apa itu private placement saham?", category: "saham", format: "FAQ" },
      { question: "Apa itu tender offer dan wajib beli?", category: "saham", format: "FAQ" },
      { question: "Apa itu saham prefensi (preferred stock)?", category: "saham", format: "FAQ" },
      { question: "Apa itu market cap dan cara menghitungnya?", category: "saham", format: "FAQ" },
      { question: "Apa itu free float dan kenapa penting?", category: "saham", format: "FAQ" },
      { question: "Apa itu indeks SRI-KEHATI dan KOMPAS100?", category: "saham", format: "FAQ" },
      { question: "Apa itu sektor di Bursa Efek Indonesia?", category: "saham", format: "FAQ" },
      { question: "Apa perbedaan bursa utama dan bursa pengembangan?", category: "saham", format: "FAQ" },
      { question: "Apa itu corporate action saham?", category: "saham", format: "FAQ" },
      { question: "Bagaimana cara membaca kode ticker saham BEI?", category: "saham", format: "FAQ" },
      { question: "Apa itu cum date dan ex date dividen?", category: "saham", format: "FAQ" },
      { question: "Apa itu trading halt dan suspension?", category: "saham", format: "FAQ" },
      { question: "Apa itu sahamsyariah dan DES?", category: "saham", format: "FAQ" },
      { question: "Apa itu fractional share (saham brjpahan)?", category: "saham", format: "FAQ" },
      { question: "Bagaimana cara transfer saham antar sekuritas?", category: "saham", format: "FAQ" },
      { question: "Apa itu reopening market dan closing auction?", category: "saham", format: "FAQ" },
      { question: "Apa itu record date dividen?", category: "saham", format: "FAQ" },
      { question: "Bagaimana cara mengikuti RUPS (Rapat Umum Pemegang Saham)?", category: "saham", format: "FAQ" },
    ],
  },

  // ─── TRADING & STRATEGI ───
  {
    id: "trading",
    label: "Trading & Strategi",
    topics: [
      { question: "Bagaimana cara menentukan stop loss?", category: "trading", format: "MINI_ARTICLE" },
      { question: "Apa itu breakout dan fakeout?", category: "trading", format: "FAQ" },
      { question: "Apa itu divergensi dalam trading?", category: "trading", format: "FAQ" },
      { question: "Bagaimana strategi swing trading saham?", category: "trading", format: "MINI_ARTICLE" },
      { question: "Apa itu risk reward ratio?", category: "trading", format: "FAQ" },
      { question: "Apa itu paper trading?", category: "trading", format: "FAQ" },
      { question: "Bagaimana cara membaca candlestick?", category: "trading", format: "MINI_ARTICLE" },
      { question: "Apa itu lot dan fraksi harga di BEI?", category: "trading", format: "FAQ" },
      { question: "Apa itu short selling di BEI?", category: "trading", format: "FAQ" },
      { question: "Bagaimana cara menggunakan screener saham?", category: "trading", format: "MINI_ARTICLE" },
      { question: "Apa itu scalping dan apakah cocok untuk pemula?", category: "trading", format: "FAQ" },
      { question: "Bagaimana strategi day trading saham BEI?", category: "trading", format: "MINI_ARTICLE" },
      { question: "Apa itu trailing stop dan cara menggunakannya?", category: "trading", format: "FAQ" },
      { question: "Apa itu average down vs average up?", category: "trading", format: "FAQ" },
      { question: "Bagaimana cara mengenali pola chart (chart pattern)?", category: "trading", format: "MINI_ARTICLE" },
      { question: "Apa itu price action trading?", category: "trading", format: "FAQ" },
      { question: "Apa itu supply dan demand zone?", category: "trading", format: "FAQ" },
      { question: "Apa itu martingale strategi dan risikonya?", category: "trading", format: "FAQ" },
      { question: "Bagaimana cara trading saham syariah?", category: "trading", format: "FAQ" },
      { question: "Apa itu gap trading dan jenis-jenis gap?", category: "trading", format: "FAQ" },
      { question: "Bagaimana cara menggunakan take profit?", category: "trading", format: "FAQ" },
      { question: "Apa itu momentum trading?", category: "trading", format: "FAQ" },
      { question: "Apa itu mean reversion strategy?", category: "trading", format: "FAQ" },
      { question: "Apa itu Elliott Wave Theory?", category: "trading", format: "FAQ" },
      { question: "Apa itu harmonic pattern (Gartley, Bat, Crab)?", category: "trading", format: "FAQ" },
    ],
  },

  // ─── FUNDAMENTAL ANALYSIS ───
  {
    id: "fundamental",
    label: "Analisis Fundamental",
    topics: [
      { question: "Apa itu PER (Price to Earnings Ratio) dan cara membacanya?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu PBV (Price to Book Value)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu ROE (Return on Equity)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu ROA (Return on Assets)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu EPS (Earnings Per Share)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu DER (Debt to Equity Ratio)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu DPR (Dividend Payout Ratio)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu NPM (Net Profit Margin)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu EBITDA dan kenapa penting?", category: "fundamental", format: "FAQ" },
      { question: "Bagaimana cara membaca laporan keuangan tahunan emiten?", category: "fundamental", format: "MINI_ARTICLE" },
      { question: "Apa itu laporan laba rugi dan cara membacanya?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu neraca (balance sheet) perusahaan?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu laporan arus kas (cash flow statement)?", category: "fundamental", format: "FAQ" },
      { question: "Apa perbedaan laba kotor, laba operasi, dan laba bersih?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu goodwill di laporan keuangan?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu modal kerja (working capital)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu depresiasi dan amortisasi?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu laba ditahan (retained earnings)?", category: "fundamental", format: "FAQ" },
      { question: "Bagaimana cara menilai valuasi saham yang wajar?", category: "fundamental", format: "MINI_ARTICLE" },
      { question: "Apa itu EV/EBITDA dan kapan menggunakannya?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu current ratio dan quick ratio?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu inventory turnover ratio?", category: "fundamental", format: "FAQ" },
      { question: "Bagaimana cara membaca catatan laporan keuangan?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu PEG ratio (PEG Ratio)?", category: "fundamental", format: "FAQ" },
      { question: "Apa itu book value per share?", category: "fundamental", format: "FAQ" },
    ],
  },

  // ─── MAKROEKONOMI ───
  {
    id: "makro",
    label: "Makroekonomi",
    topics: [
      { question: "Apa dampak inflasi terhadap saham?", category: "makro", format: "FAQ" },
      { question: "Bagaimana suku bunga BI mempengaruhi IHSG?", category: "makro", format: "FAQ" },
      { question: "Apa pengaruh The Fed (Bank Sentral AS) ke IHSG?", category: "makro", format: "FAQ" },
      { question: "Apa itu GDP dan hubungannya dengan pasar saham?", category: "makro", format: "FAQ" },
      { question: "Bagaimana nilai tukar rupiah mempengaruhi saham?", category: "makro", format: "FAQ" },
      { question: "Apa itu trade balance dan dampaknya ke IHSG?", category: "makro", format: "FAQ" },
      { question: "Apa itu defisit anggaran dan dampaknya ke pasar?", category: "makro", format: "FAQ" },
      { question: "Apa itu yield bond dan kenapa trader saham perlu tahu?", category: "makro", format: "FAQ" },
      { question: "Apa itu quantitative easing (QE)?", category: "makro", format: "FAQ" },
      { question: "Bagaimana geopolitik mempengaruhi IHSG?", category: "makro", format: "FAQ" },
      { question: "Apa itu resesi dan dampaknya ke investasi saham?", category: "makro", format: "FAQ" },
      { question: "Apa itu CPI (Consumer Price Index)?", category: "makro", format: "FAQ" },
      { question: "Apa itu neraca pembayaran?", category: "makro", format: "FAQ" },
      { question: "Apa itu Credit SRR (Statutory Reserve Requirement)?", category: "makro", format: "FAQ" },
      { question: "Apa itu risiko country rating downgrade?", category: "makro", format: "FAQ" },
    ],
  },

  // ─── INSTRUMEN INVESTASI ───
  {
    id: "instrumen",
    label: "Instrumen Investasi",
    topics: [
      { question: "Apa itu reksa dana dan jenis-jenisnya?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu ETF (Exchange Traded Fund)?", category: "instrumen", format: "FAQ" },
      { question: "Apa perbedaan reksa dana dan saham?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu obligasi (bond) dan cara kerjanya?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu sukuk dan perbedaannya dengan obligasi?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu SBN (Surat Berharga Negara)?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu SBR (Savings Bond Ritel)?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu ST (Sukuk Tabungan)?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu warrant dan cara trading-nya?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu kontrak berjangka (futures)?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu reksa dana saham vs pendapatan tetap?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu reksa dana indeks?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu mutual fund NAB dan cara menghitungnya?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu gold investment vs saham?", category: "instrumen", format: "FAQ" },
      { question: "Apa itu DIPS (Dividen Investasi Plan Saham)?", category: "instrumen", format: "FAQ" },
    ],
  },

  // ─── PAJAK & REGULASI ───
  {
    id: "pajak",
    label: "Pajak & Regulasi",
    topics: [
      { question: "Berapa pajak dividen saham di Indonesia?", category: "pajak", format: "FAQ" },
      { question: "Berapa pajak capital gain saham di Indonesia?", category: "pajak", format: "FAQ" },
      { question: "Apakah perlu NPWP untuk beli saham?", category: "pajak", format: "FAQ" },
      { question: "Apa itu final tax 0.1% untuk trading saham?", category: "pajak", format: "FAQ" },
      { question: "Bagaimana pajak untuk investor asing di BEI?", category: "pajak", format: "FAQ" },
      { question: "Apa itu RDN (Rekening Dana Nasabah)?", category: "pajak", format: "FAQ" },
      { question: "Apa itu kustodi dan peran KSEI?", category: "pajak", format: "FAQ" },
      { question: "Apa itu peran KPEI di Bursa Efek Indonesia?", category: "pajak", format: "FAQ" },
      { question: "Bagaimana regulasi OJK untuk perlindungan investor?", category: "pajak", format: "FAQ" },
      { question: "Apa itu SIUP-PB dan izin usaha sekuritas?", category: "pajak", format: "FAQ" },
    ],
  },

  // ─── PSIKOLOGI TRADING ───
  {
    id: "psikologi",
    label: "Psikologi Trading",
    topics: [
      { question: "Apa itu FOMO dalam trading dan cara menghindarinya?", category: "psikologi", format: "FAQ" },
      { question: "Bagaimana mengatasi fear (ketakutan) dalam trading?", category: "psikologi", format: "FAQ" },
      { question: "Apa itu loss aversion dan dampaknya ke trading?", category: "psikologi", format: "FAQ" },
      { question: "Apa itu confirmation bias dalam investasi saham?", category: "psikologi", format: "FAQ" },
      { question: "Mengapa trading journal penting?", category: "psikologi", format: "FAQ" },
      { question: "Bagaimana membuat trading plan yang baik?", category: "psikologi", format: "MINI_ARTICLE" },
      { question: "Apa itu greed (keserakahan) dan cara mengontrolnya?", category: "psikologi", format: "FAQ" },
      { question: "Apa itu sunk cost fallacy dalam trading?", category: "psikologi", format: "FAQ" },
      { question: "Bagaimana cara mengatasi stress setelah loss?", category: "psikologi", format: "FAQ" },
      { question: "Apa itu disiplin trading dan cara menjaganya?", category: "psikologi", format: "FAQ" },
    ],
  },

  // ─── PORTOFOLIO & MANAJEMEN RISIKO ───
  {
    id: "portofolio",
    label: "Portofolio & Manajemen Risiko",
    topics: [
      { question: "Apa itu diversifikasi portofolio?", category: "portofolio", format: "FAQ" },
      { question: "Berapa banyak saham ideal dalam portofolio?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu asset allocation?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu rebalancing portofolio dan kapan melakukannya?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu Dollar Cost Averaging (DCA)?", category: "portofolio", format: "FAQ" },
      { question: "Apa perbedaan DCA dan lump sum investing?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu value averaging method?", category: "portofolio", format: "FAQ" },
      { question: "Bagaimana cara menghitung maksimal loss per trade?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu position sizing?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu risk per trade (1% rule)?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu drawdown dan maximum drawdown?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu Sharpe Ratio?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu correlation antar saham dalam portofolio?", category: "portofolio", format: "FAQ" },
      { question: "Apa itu beta dan alpha saham?", category: "portofolio", format: "FAQ" },
    ],
  },

  // ─── GLOSARIUM ───
  {
    id: "glosarium",
    label: "Glosarium Istilah",
    topics: [
      { question: "Apa arti bullish dan bearish?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu accumulation dan distribution?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu bid dan ask price?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu spread dalam trading saham?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu leverage dan margin?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu averaging dan cost averaging?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu IPO grading?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu book building?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu underwriter?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu capital gain dan capital loss?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu turnover ratio saham?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu market order dan limit order?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu trailing stop order?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu broker vs dealer?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu clearing dan settlement?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu insider trading?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu front running?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu wash trade?", category: "glosarium", format: "FAQ" },
      { question: "Apa itu pump and dump?", category: "glosarium", format: "FAQ" },
    ],
  },

  // ─── UMUM ───
  {
    id: "umum",
    label: "Umum",
    topics: [
      { question: "Apa itu TeknikalID?", category: "umum", format: "FAQ" },
      { question: "Apakah data harga saham di TeknikalID real-time?", category: "umum", format: "FAQ" },
      { question: "Apa itu screener saham?", category: "umum", format: "FAQ" },
      { question: "Apakah TeknikalID gratis?", category: "umum", format: "FAQ" },
      { question: "Bagaimana cara mendaftar sekuritas untuk beli saham?", category: "umum", format: "MINI_ARTICLE" },
      { question: "Apa itu aplikasi trading saham terbaik di Indonesia?", category: "umum", format: "FAQ" },
      { question: "Apa perbedaan RDB dan RDN?", category: "umum", format: "FAQ" },
      { question: "Bagaimana cara memilih sekuritas (broker) yang bagus?", category: "umum", format: "FAQ" },
      { question: "Apa itu single investor ID (SID)?", category: "umum", format: "FAQ" },
    ],
  },
];

export const ALL_FAQ_TOPICS: FAQTopic[] = FAQ_TOPIC_CATEGORIES.flatMap((cat) => cat.topics);
