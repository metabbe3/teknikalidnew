export interface PricingCard {
  tier: string;
  price: string;
  period: string;
  originalPrice?: string;
  badge?: string;
  description: string;
  features: string[];
  ctaHref: string;
  ctaLabel: string;
  isPopular: boolean;
  paymentNote?: string;
}

export const PAYMENT_NOTE =
  "Bayar via bot Telegram · Midtrans · batal kapan saja";

export const PRICING_DISCLAIMER =
  "* Bukan nasihat keuangan. Seluruh analisa teknikal, data pasar, dan sinyal otomatis disajikan hanya untuk tujuan edukasi dan informasi. Keputusan investasi dan trading sepenuhnya menjadi tanggung jawab masing-masing trader.";

export interface HargaFaqItem {
  question: string;
  answer: string;
}

export const HARGA_FAQS: HargaFaqItem[] = [
  {
    question: "Bagaimana cara berlangganan?",
    answer:
      "Klik tombol pilih paket (Night Trader atau Pro) di atas untuk langsung membuka bot Telegram @TeknikalidAgentBot. Ikuti petunjuk di bot dan selesaikan pembayaran via Midtrans (QRIS atau e-wallet). Akses asisten dan kuota kamu langsung aktif otomatis.",
  },
  {
    question: "Bagaimana cara bayarnya?",
    answer:
      "Klik tombol langganan di atas → chat terbuka di bot Telegram → selesaikan pembayaran via Midtrans (QRIS/e-wallet/kartu).",
  },
  {
    question: "Bisa berhenti langganan kapan saja?",
    answer:
      "Bisa, kamu bisa berhenti langganan kapan saja tanpa penalti atau komitmen jangka panjang. Tidak ada pemotongan saldo otomatis tanpa persetujuanmu. Jika periode langganan habis dan tidak diperpanjang, akun otomatis kembali ke paket gratis di web.",
  },
  {
    question: "Apa bedanya Night Trader dan Pro?",
    answer:
      "Night Trader (Rp14.900/bulan pertama, lalu Rp29.000/bln) dirancang untuk trader swing dengan 150 kuota tanya bot, 10 saham watchlist, 10 alert harga 24/7, dan brief sore 15:35 WIB. Paket Pro (Rp29.000/bulan pertama, lalu Rp79.000/bln) ditujukan untuk trader aktif dengan 400 kuota tanya, 25 saham watchlist, 25 alert harga, serta prioritas respons saat jam bursa aktif.",
  },
];

export function getHargaFaqs(): HargaFaqItem[] {
  return HARGA_FAQS;
}

export function getPricingDisclaimer(): string {
  return PRICING_DISCLAIMER;
}

export interface TierPriceSummary {
  tier: string;
  price: string;
  period: string;
  originalPrice?: string;
  badge?: string;
}

/**
 * Pure function: mengembalikan ringkasan harga tier tertentu (SATU PINTU).
 * Dipakai oleh halaman /harga dan /agent agar angka konsisten.
 */
export function getTierPrice(tier: string): TierPriceSummary | undefined {
  const cards = buildPricingCards();
  const normalized = tier.trim().toLowerCase().replace(/[-_]/g, " ");
  const card = cards.find((c) => {
    const t = c.tier.toLowerCase();
    return t === normalized || (normalized === "basic" && t === "night trader");
  });
  if (!card) return undefined;
  return {
    tier: card.tier,
    price: card.price,
    period: card.period,
    originalPrice: card.originalPrice,
    badge: card.badge,
  };
}

/**
 * Pure function: menghasilkan daftar 3 kartu harga paket Teknikal.id
 * Snapshot benefit & nominal terverifikasi dari kode & dokumentasi repo.
 */
export function buildPricingCards(): PricingCard[] {
  return [
    {
      tier: "Free",
      price: "Rp0",
      period: "/hari",
      description: "Untuk mencoba fitur analisa teknikal web dan asisten AI tanpa komitmen.",
      features: [
        "Tanya AI 150/hari (guest 50/hari, akun login 150/hari)",
        "Latihan trading virtual (paper trading) gratis",
        "Screener saham IDX lengkap (LQ45, RSI, MACD)",
        "Chart interaktif 956+ saham & ringkasan tren pasar",
        "Tanpa kartu kredit, gratis selamanya",
      ],
      ctaHref: "/stocks",
      ctaLabel: "Mulai Gratis di Web",
      isPopular: false,
    },
    {
      tier: "Night Trader",
      price: "Rp14.900",
      period: "/bulan pertama",
      originalPrice: "Rp29.000",
      badge: "Rekomendasi awal",
      description: "Untuk trader swing dan pekerja kantoran yang menyusun rencana trading tiap malam.",
      features: [
        "150 kuota tanya bot Telegram per bulan (unlimited analisa sesi)",
        "Simpan hingga 10 saham di watchlist pantauan (blast watchlist harian)",
        "10 alert harga aktif otomatis 24/7 via Telegram",
        "Ringkasan level support, resistance, tren, dan volume",
        "Brief sore penutupan pasar 15:35 WIB",
      ],
      ctaHref: "https://t.me/TeknikalidAgentBot?start=upgrade",
      ctaLabel: "Ambil Night Trader Rp14.900",
      isPopular: true,
      paymentNote: PAYMENT_NOTE,
    },
    {
      tier: "Pro",
      price: "Rp29.000",
      period: "/bulan pertama",
      originalPrice: "Rp79.000",
      badge: "FITUR LENGKAP",
      description: "Untuk trader aktif yang memantau banyak saham dan pergerakan sektor setiap hari.",
      features: [
        "Semua fitur Night Trader",
        "400 kuota tanya bot Telegram per bulan (~20x tiap hari bursa)",
        "Simpan hingga 25 saham di watchlist pantauan",
        "25 alert harga aktif otomatis 24/7 via Telegram",
        "Prioritas respons bot saat jam pasar bursa aktif",
      ],
      ctaHref: "https://t.me/TeknikalidAgentBot?start=upgrade",
      ctaLabel: "Ambil Pro Rp29.000",
      isPopular: false,
      paymentNote: PAYMENT_NOTE,
    },
  ];
}
