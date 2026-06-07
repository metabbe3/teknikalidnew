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
    ],
  },
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
    ],
  },
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
    ],
  },
  {
    id: "umum",
    label: "Umum",
    topics: [
      { question: "Apa itu TeknikalID?", category: "umum", format: "FAQ" },
      { question: "Apakah data harga saham di TeknikalID real-time?", category: "umum", format: "FAQ" },
      { question: "Apa itu screener saham?", category: "umum", format: "FAQ" },
      { question: "Apakah TeknikalID gratis?", category: "umum", format: "FAQ" },
    ],
  },
];

export const ALL_FAQ_TOPICS: FAQTopic[] = FAQ_TOPIC_CATEGORIES.flatMap((cat) => cat.topics);
