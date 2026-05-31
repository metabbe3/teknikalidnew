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

    // Find stocks to deactivate (in DB but not in IDX)
    for (const [code, db] of dbMap) {
      if (!idxMap.has(code) && db.isActive) {
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
    await prisma.stock.update({
      where: { id: stock.id },
      data: {
        ...(profile.Alamat && { address: profile.Alamat.replace(/\r\n/g, ", ") }),
        ...(profile.Telepon && { phone: profile.Telepon }),
        ...(profile.Email && { email: profile.Email }),
        ...(profile.Website && { website: profile.Website }),
        ...(profile.SubSektor && { subSector: profile.SubSektor }),
        ...(profile.PapanPencatatan && { listingBoard: profile.PapanPencatatan }),
        ...(profile.TanggalPencatatan && { listingDate: parseIdxDate(profile.TanggalPencatatan) }),
        ...(profile.Logo && { logo: `https://www.idx.co.id${profile.Logo}` }),
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
    const shareholders = (detail.PemegangSaham ?? []).map((s) => ({
      name: s.Nama,
      type: s.Kategori || null,
      shares: s.Jumlah ?? null,
      percent: s.Persentase ?? null,
    }));
    const shareholderCount = await stockRepository.replaceShareholders(stock.id, shareholders);

    // Replace subsidiaries
    const subsidiaries = (detail.AnakPerusahaan ?? []).map((s) => ({
      name: s.Nama,
      businessType: s.BidangUsaha?.replace(/\r\n/g, " ") || null,
      totalAssets: s.JumlahAset ?? null,
      ownershipPercent: s.Persentase ?? null,
    }));
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
