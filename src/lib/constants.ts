export const SITE_URL = "https://teknikal.id";

export { IDX_STOCKS, IDX40_TICKERS, ALL_TICKERS, IDX_SECTORS, isIDX40, type IDXStockFull } from "./idx-stocks";
import { IDX_STOCKS as _IDX_STOCKS, ALL_TICKERS as _ALL_TICKERS } from "./idx-stocks";

export interface IDXStock {
  ticker: string;
  name: string;
  sector: string;
}

export const IDX40: IDXStock[] = [
  { ticker: "BBCA.JK", name: "Bank Central Asia", sector: "Finance" },
  { ticker: "BBRI.JK", name: "Bank Rakyat Indonesia", sector: "Finance" },
  { ticker: "AMMN.JK", name: "Amman Mineral Internasional", sector: "Non-energy Minerals" },
  { ticker: "BMRI.JK", name: "Bank Mandiri (Persero)", sector: "Finance" },
  { ticker: "TLKM.JK", name: "Telkom Indonesia", sector: "Communications" },
  { ticker: "ASII.JK", name: "Astra International", sector: "Distribution Services" },
  { ticker: "BBNI.JK", name: "Bank Negara Indonesia", sector: "Finance" },
  { ticker: "BRIS.JK", name: "Bank Syariah Indonesia", sector: "Finance" },
  { ticker: "ICBP.JK", name: "Indofood CBP Sukses Makmur", sector: "Consumer Non-durables" },
  { ticker: "AMRT.JK", name: "Sumber Alfaria Trijaya", sector: "Retail Trade" },
  { ticker: "GOTO.JK", name: "Gojek Tokopedia", sector: "Technology Services" },
  { ticker: "UNTR.JK", name: "United Tractors", sector: "Energy Minerals" },
  { ticker: "BRPT.JK", name: "Barito Pacific", sector: "Non-energy Minerals" },
  { ticker: "CPIN.JK", name: "Charoen Pokphand Indonesia", sector: "Process Industries" },
  { ticker: "INDF.JK", name: "Indofood Sukses Makmur", sector: "Consumer Non-durables" },
  { ticker: "ADRO.JK", name: "Alamtri Resources Indonesia", sector: "Energy Minerals" },
  { ticker: "KLBF.JK", name: "Kalbe Farma", sector: "Health Technology" },
  { ticker: "ISAT.JK", name: "Indosat", sector: "Communications" },
  { ticker: "UNVR.JK", name: "Unilever Indonesia", sector: "Consumer Non-durables" },
  { ticker: "ANTM.JK", name: "Aneka Tambang", sector: "Non-energy Minerals" },
  { ticker: "PGAS.JK", name: "Perusahaan Gas Negara", sector: "Utilities" },
  { ticker: "MDKA.JK", name: "Merdeka Copper Gold", sector: "Non-energy Minerals" },
  { ticker: "PGEO.JK", name: "Pertamina Geothermal Energy", sector: "Utilities" },
  { ticker: "MBMA.JK", name: "Merdeka Battery Materials", sector: "Non-energy Minerals" },
  { ticker: "ADMR.JK", name: "Adaro Minerals Indonesia", sector: "Energy Minerals" },
  { ticker: "INKP.JK", name: "Indah Kiat Pulp and Paper", sector: "Process Industries" },
  { ticker: "INCO.JK", name: "Vale Indonesia", sector: "Non-energy Minerals" },
  { ticker: "PTBA.JK", name: "Bukit Asam", sector: "Energy Minerals" },
  { ticker: "EXCL.JK", name: "XL Axiata", sector: "Communications" },
  { ticker: "TOWR.JK", name: "Sarana Menara Nusa", sector: "Finance" },
  { ticker: "ITMG.JK", name: "Indo Tambangraya Megah", sector: "Energy Minerals" },
  { ticker: "JSMR.JK", name: "Jasa Marga", sector: "Transportation" },
  { ticker: "ARTO.JK", name: "Bank Jago", sector: "Finance" },
  { ticker: "MEDC.JK", name: "Medco Energi International", sector: "Energy Minerals" },
  { ticker: "MAPI.JK", name: "Mitra Adiperkasa", sector: "Retail Trade" },
  { ticker: "AKRA.JK", name: "AKR Corporindo", sector: "Distribution Services" },
  { ticker: "MAPA.JK", name: "Map Aktif Adiperkasa", sector: "Retail Trade" },
  { ticker: "JPFA.JK", name: "Japfa Comfeed Indonesia", sector: "Process Industries" },
  { ticker: "SMGR.JK", name: "Semen Indonesia", sector: "Non-energy Minerals" },
  { ticker: "SIDO.JK", name: "Industri Jamu and Farmasi Sido Muncul", sector: "Health Technology" },
];

export const SECTORS = [...new Set(_IDX_STOCKS.map((s) => s.sector))].sort();

export const TICKERS = _ALL_TICKERS;

export type DateRange = "1D" | "5D" | "1mo" | "3mo" | "6mo" | "1y" | "2y";

export const RANGE_DAYS: Record<DateRange, number> = {
  "1D": 1,
  "5D": 5,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "2y": 730,
};

export const RANGE_KEYS: DateRange[] = ["1D", "5D", "1mo", "3mo", "6mo", "1y", "2y"];

export type IntradayInterval = "5m" | "15m" | "60m";

export const INTRADAY_CONFIG: Partial<Record<DateRange, IntradayInterval>> = {
  "1D": "5m",
  "5D": "15m",
};

export const RSI_THRESHOLDS = {
  OVERSOLD_EXTREME: 20,
  OVERSOLD: 30,
  OVERBOUGHT: 70,
  OVERBOUGHT_EXTREME: 80,
} as const;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export const INTERVAL = {
  DAY: "1d",
} as const;

export const SIGNALS = {
  SMA_CROSS: { GOLDEN: "golden_cross", DEATH: "death_cross" },
  EMA_CROSS: { BULLISH: "bullish", BEARISH: "bearish" },
} as const;

export const PREDICTION_DIRECTION = {
  UP: "UP",
  DOWN: "DOWN",
} as const;

export const PREDICTION_OUTCOME = {
  CORRECT: "CORRECT",
  INCORRECT: "INCORRECT",
  EXPIRED: "EXPIRED",
} as const;
