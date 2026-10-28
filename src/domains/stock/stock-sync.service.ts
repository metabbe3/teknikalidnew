import { stockRepository } from "./stock.repository";
import { prisma } from "@/lib/prisma";
import { getCompanyProfileDetail, type IDXProfileResponse, type IDXTradingInfoResponse } from "@/lib/idx-api";

export interface IDXStockEntry {
  code: string;
  name: string;
  board: string;
}

export interface SyncResult {
  added: string[];
  removed: string[];
  updated: Array<{ ticker: string; changes: string[] }>;
  unchanged: number;
}

function cleanName(name: string): string {
  return name
    .replace(/\s*Tb[kl]\.?\s*$/i, "")
    .replace(/\s*\(Persero\)\s*Tb[kl]\.?\s*$/i, "")
    .replace(/\s*\(Persero\)\s*$/i, "")
    .trim();
}

export function parseIdxDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export const stockSyncService = {
  async syncFromIDXStockList(idxStocks: IDXStockEntry[]): Promise<SyncResult> {
    const dbStocks = await stockRepository.findAllStocks();
    const dbMap = new Map(dbStocks.map((s) => [s.ticker.replace(".JK", ""), s]));
    const idxMap = new Map(idxStocks.map((s) => [s.code, s]));

    // GUARD (16 Okt): IDX diblok Cloudflare beberapa kali → daftar kosong/gagal
    // sempat mass-deactivate ^JKSE + ratusan saham ("korban" tidak ada di list).
    // Daftar < 200 entry = sinyal fetch rusak → batalkan sinkronisasi, jangan
    // sentuh isActive sama sekali. IDX riil ~950+ emiten.
    if (idxStocks.length < 200) {
      throw new Error(
        `IDX list suspiciously small (${idxStocks.length} entries) — aborting sync to avoid mass-deactivation`
      );
    }

    const added: string[] = [];
    const removed: string[] = [];
    const updated: Array<{ ticker: string; changes: string[] }> = [];
    let unchanged = 0;

    // Find stocks to add (in IDX but not in DB)
    for (const [code, idx] of idxMap) {
      const db = dbMap.get(code);
      if (!db) {
        await prisma.stock.create({
          data: {
            ticker: code + ".JK",
            name: cleanName(idx.name),
            sector: "Uncategorized",
            listingBoard: idx.board,
            isActive: true,
          },
        });
        added.push(code);
      }
    }

    // Find stocks to deactivate (in DB but not in IDX).
    // Indices (^JKSE etc.) are never IDX-listed equities — always exempt.
    for (const [code, db] of dbMap) {
      if (!idxMap.has(code) && db.isActive && !db.ticker.startsWith("^")) {
        await prisma.stock.update({
          where: { id: db.id },
          data: { isActive: false },
        });
        removed.push(code);
      }
      // Reactivate if previously deactivated and now back on IDX
      if (idxMap.has(code) && !db.isActive) {
        await prisma.stock.update({
          where: { id: db.id },
          data: { isActive: true },
        });
        added.push(code + " (reactivated)");
      }
    }

    // Find stocks to update (in both, check name/board changes)
    for (const [code, idx] of idxMap) {
      const db = dbMap.get(code);
      if (!db) continue;

      const changes: string[] = [];
      const idxName = cleanName(idx.name);

      if (db.name !== idxName) changes.push(`name: "${db.name}" → "${idxName}"`);
      if (db.listingBoard !== idx.board) changes.push(`board: "${db.listingBoard}" → "${idx.board}"`);

      if (changes.length > 0) {
        await prisma.stock.update({
          where: { id: db.id },
          data: {
            ...(db.name !== idxName && { name: idxName }),
            ...(db.listingBoard !== idx.board && { listingBoard: idx.board }),
          },
        });
        updated.push({ ticker: code + ".JK", changes });
      } else {
        unchanged++;
      }
    }

    return { added, removed, updated, unchanged };
  },

  // ── IDX Company Profile Detail Sync ──
  // Fetches and stores: industry classification, commissioners, subsidiaries, dividends

  async syncCompanyProfile(ticker: string): Promise<{
    profile: boolean;
    commissioners: number;
    subsidiaries: number;
    dividends: number;
  }> {
    const code = ticker.replace(".JK", "");
    const detail = await getCompanyProfileDetail(code);
    if (!detail) {
      return { profile: false, commissioners: 0, subsidiaries: 0, dividends: 0 };
    }
    return this.processCompanyProfile(ticker, detail);
  },

  // Process pre-fetched IDX profile data (used by Playwright backfill to bypass Cloudflare)
  async processCompanyProfile(ticker: string, detail: IDXProfileResponse): Promise<{
    profile: boolean;
    commissioners: number;
    directors: number;
    shareholders: number;
    subsidiaries: number;
    dividends: number;
  }> {
    if (!detail.Profiles || detail.Profiles.length === 0) {
      return { profile: false, commissioners: 0, directors: 0, shareholders: 0, subsidiaries: 0, dividends: 0 };
    }

    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new Error(`Stock not found: ${ticker}`);

    const profile = detail.Profiles[0];

    // Update stock profile fields (including address/phone/email/website from official IDX source)
    await stockRepository.updateStockProfile(stock.id, {
      industry: profile.Industri || null,
      subIndustry: profile.SubIndustri || null,
      fax: profile.Fax || null,
      npwp: profile.NPWP || null,
    });

    // Also update address, phone, email, website if they came from IDX
    // Guard panjang kolom (28 Okt: INKP email gabungan 4 alamat 127ch > varchar(100) →
    // prisma throw "value too long" membatalkan seluruh emiten). Slice ke kapasitas kolom.
    const fit = (v: string | null | undefined, max: number): string | undefined =>
      v ? v.slice(0, max) : undefined;
    await prisma.stock.update({
      where: { id: stock.id },
      data: {
        ...(profile.Alamat && { address: fit(profile.Alamat.replace(/\r\n/g, ", "), 500) }),
        ...(profile.Telepon && { phone: fit(profile.Telepon, 50) }),
        ...(profile.Email && { email: fit(profile.Email, 100) }),
        ...(profile.Website && { website: fit(profile.Website, 500) }),
        ...(profile.SubSektor && { subSector: fit(profile.SubSektor, 100) }),
        ...(profile.PapanPencatatan && { listingBoard: fit(profile.PapanPencatatan, 50) }),
        ...(profile.TanggalPencatatan && { listingDate: parseIdxDate(profile.TanggalPencatatan) }),
        ...(profile.Logo && { logo: fit(`https://www.idx.co.id${profile.Logo}`, 500) }),
        ...(profile.KegiatanUsahaUtama && { businessActivity: profile.KegiatanUsahaUtama }),
      },
    });

    // Replace commissioners
    const commissioners = (detail.Komisaris ?? []).map((k) => ({
      name: k.Nama,
      position: k.Jabatan || null,
      independent: !!k.Independen,
    }));
    const commissionerCount = await stockRepository.replaceCommissioners(stock.id, commissioners);

    // Replace directors
    const directors = (detail.Direktur ?? []).map((d) => ({
      name: d.Nama,
      position: d.Jabatan || "Direktur",
      type: "direktur" as const,
      independent: !d.Afiliasi,
    }));
    const directorCount = await stockRepository.replaceDirectors(stock.id, directors);

    // Replace shareholders
    // Fix 28 Okt (bareng VIVA): clamp persen Decimal(6,2) — data IDX kotor bisa
    // membatalkan emiten via "Value out of range" (pola sama dgn subsidiaries).
    const shareholders = (detail.PemegangSaham ?? []).map((s) => ({
      name: s.Nama,
      type: s.Kategori || null,
      shares: typeof s.Jumlah === "number" && s.Jumlah >= 0 ? s.Jumlah : null,
      percent: typeof s.Persentase === "number" && s.Persentase >= 0 ? Math.min(s.Persentase, 9999.99) : null,
    }));
    const shareholderCount = await stockRepository.replaceShareholders(stock.id, shareholders);

    // Replace subsidiaries
    // Fix VIVA 28 Okt: Persentase IDX kadang >9999.99 (data kotor) → Decimal(6,2)
    // "Value out of range" membatalkan seluruh emiten. Clamp: percent ≤ 9999.99
    // (dan negatif → null), JumlahAset juga clamp ke kapasitas Decimal(20,2).
    const subsidiaries = (detail.AnakPerusahaan ?? []).map((s) => {
      const pct = typeof s.Persentase === "number" && s.Persentase >= 0 ? Math.min(s.Persentase, 9999.99) : null;
      const assets = typeof s.JumlahAset === "number" && s.JumlahAset >= 0 ? Math.min(s.JumlahAset, 99999999999999999999.99) : null;
      return {
        name: s.Nama,
        businessType: s.BidangUsaha?.replace(/\r\n/g, " ") || null,
        totalAssets: assets,
        ownershipPercent: pct,
      };
    });
    const subsidiaryCount = await stockRepository.replaceSubsidiaries(stock.id, subsidiaries);

    // Upsert dividends (comes directly from profile response)
    const dividendItems = (detail.Dividen ?? [])
      .filter((d) => d.CashDividenPerSaham > 0 || d.TotalSahamBonus > 0)
      .map((d) => ({
        stockId: stock.id,
        year: parseInt(d.TahunBuku, 10),
        type: d.Jenis === "ds" ? "stock" : "cash",
        currency: d.CashDividenPerSahamMU || null,
        amount: d.CashDividenPerSaham || null,
        totalAmount: d.CashDividenTotal || null,
        cumDate: parseIdxDate(d.TanggalCum),
        exDate: parseIdxDate(d.TanggalExRegulerDanNegosiasi),
        recordDate: parseIdxDate(d.TanggalDPS),
        paymentDate: parseIdxDate(d.TanggalPembayaran),
      }));

    const dividendCount = dividendItems.length > 0
      ? await stockRepository.batchUpsertDividends(dividendItems)
      : 0;

    return {
      profile: true,
      commissioners: commissionerCount,
      directors: directorCount,
      shareholders: shareholderCount,
      subsidiaries: subsidiaryCount,
      dividends: dividendCount,
    };
  },

  // ── IDX Trading Info Sync ──

  async processTradingInfo(ticker: string, data: IDXTradingInfoResponse): Promise<boolean> {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) return false;

    const updates: Parameters<typeof stockRepository.updateTradingInfo>[1] = {};

    if (data.JumlahSahamTercatat != null) {
      updates.listedShares = BigInt(Math.round(data.JumlahSahamTercatat));
    }
    if (data.PersentasePemilikAsing != null) {
      updates.foreignOwnershipPercent = data.PersentasePemilikAsing;
    }
    if (data.KodeISIN != null) {
      updates.isinCode = String(data.KodeISIN);
    }

    if (Object.keys(updates).length > 0) {
      await stockRepository.updateTradingInfo(stock.id, updates);
      return true;
    }
    return false;
  },
};
