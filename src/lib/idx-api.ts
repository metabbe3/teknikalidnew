import pLimit from "p-limit";

const limit = pLimit(1);
const IDX_BASE = "https://www.idx.co.id";

async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { message?: string };
      const isRetryable =
        err?.message?.includes("429") ||
        err?.message?.includes("429") ||
        err?.message?.includes("ECONNRESET") ||
        err?.message?.includes("ETIMEDOUT");
      if (!isRetryable || attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.warn(`[IDX API] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

async function idxFetch<T>(url: string): Promise<T | null> {
  return limit(() =>
    fetchWithRetry(async () => {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
          Referer: "https://www.idx.co.id/",
        },
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`IDX API ${res.status}: ${url}`);
      }
      const data = await res.json();
      return data as T;
    })
  );
}

// ── Types (matching real IDX API response) ──

export interface IDXProfileResponse {
  Profiles: Array<{
    NamaEmiten: string;
    KodeEmiten: string;
    Alamat: string;
    Email: string;
    Telepon: string;
    Fax: string;
    NPWP: string;
    Website: string;
    TanggalPencatatan: string;
    PapanPencatatan: string;
    Sektor: string;
    SubSektor: string;
    Industri: string;
    SubIndustri: string;
    KegiatanUsahaUtama: string;
    Logo: string;
  }>;
  Direktur: Array<{
    Nama: string;
    Jabatan: string;
    Afiliasi: boolean;
  }>;
  Komisaris: Array<{
    Nama: string;
    Jabatan: string;
    Independen: boolean;
  }>;
  KomiteAudit: Array<{
    Nama: string;
    Jabatan: string;
  }>;
  Sekretaris: Array<{
    Nama: string;
    Telepon: string;
    Email: string;
    Fax: string;
  }>;
  PemegangSaham: Array<{
    Nama: string;
    Kategori: string;
    Jumlah: number;
    Persentase: number;
    Pengendali: boolean;
  }>;
  AnakPerusahaan: Array<{
    Nama: string;
    BidangUsaha: string;
    JumlahAset: number;
    Persentase: number;
    MataUang: string;
    Satuan: string;
    Lokasi: string;
    StatusOperasi: string;
    TahunKomersil: string;
  }>;
  Dividen: Array<{
    Nama: string;
    Jenis: string; // "dt" = cash dividend, "ds" = stock dividend
    TahunBuku: string;
    TotalSahamBonus: number;
    CashDividenPerSahamMU: string;
    CashDividenPerSaham: number;
    CashDividenTotalMU: string;
    CashDividenTotal: number;
    TanggalCum: string;
    TanggalExRegulerDanNegosiasi: string;
    TanggalDPS: string;
    TanggalPembayaran: string;
    Rasio1: number;
    Rasio2: number;
  }>;
}

// ── API Functions ──

export async function getCompanyProfileDetail(
  ticker: string
): Promise<IDXProfileResponse | null> {
  const url = `${IDX_BASE}/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${encodeURIComponent(ticker)}&language=id-id`;
  return idxFetch<IDXProfileResponse>(url);
}
