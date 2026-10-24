/**
 * Selector penerima + penyusun data email day-2 (PRD idea-2026-10-19-1 / AC2).
 *
 * Pure core (testable tanpa DB) + Prisma orchestration tipis di bawah.
 *
 * Kriteria penerima (AC2, SQL terdokumentasi):
 *   createdAt 1–2 hari lalu (WIB-day diff, bukan jam)
 *   AND (Watchlist>0 OR PageView day-0 >1 view OR EngagementEvent star_add)
 *
 * SQL parity (query live yang diimplement prisma di bawah):
 *   SELECT u.id, u.email, u.name, u.username, u.created_at
 *   FROM "User" u
 *   WHERE u.created_at >= <now - 2d> AND u.created_at < <now - 1d boundary computed per-day>
 *     AND (
 *       EXISTS (SELECT 1 FROM "Watchlist" w WHERE w."userId" = u.id)
 *       OR (SELECT count(*) FROM "PageView" pv
 *           WHERE pv."userId" = u.id AND pv."isBot" = false
 *             AND pv."createdAt" >= date_trunc('day', u.created_at AT TIME ZONE 'Asia/Jakarta')
 *             AND pv."createdAt" <  date_trunc('day', u.created_at AT TIME ZONE 'Asia/Jakarta') + interval '1 day'
 *           ) > 1
 *       OR EXISTS (SELECT 1 FROM "EngagementEvent" ee
 *                   WHERE ee.type='cta_click' AND ee.label='star_add'
 *                     AND ee."anonId" IN (anonIds day-0 user tsb))
 *     );
 *   (star_add via anonId join PageView day-0 — anonId tidak tertaut ke userId,
 *    jadi proxy-nya: user punya PageView day-0 dengan path yang sama + event
 *    star_add pada menit bersamaan; utk v1 kita pakai kriteria sederhana di bawah
 *    dan catat keterbatasannya di queue result.)
 */
import { prisma } from "@/lib/prisma";
import {
  renderRetentionEmail,
  sendEmail,
  type RetentionEmailData,
  type WatchlistEmailRow,
} from "@/lib/mailer";

export const DAY2_MIN_OFFSET_DAYS = 1;
export const DAY2_MAX_OFFSET_DAYS = 2;

/** Ambil tanggal WIB (UTC+7) sebagai YYYY-MM-DD. */
export function wibDateKey(d: Date): string {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Selisih hari kalender WIB antara `now` dan `createdAt` (0 = hari yang sama). */
export function wibDayOffset(now: Date, createdAt: Date): number {
  const a = Date.UTC(...(parts(wibDateKey(now))));
  const b = Date.UTC(...(parts(wibDateKey(createdAt))));
  return Math.round((a - b) / 86400000);
}

function parts(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split("-").map(Number);
  return [y!, m! - 1, d!];
}

export type MinimalUser = {
  id: string;
  email: string;
  name: string | null;
  username: string;
  createdAt: Date;
};

export type SelectionReason = string; // "watchlist:2" | "day0_views:3" | "star_add:1"

export type SelectedRecipient = {
  user: MinimalUser;
  reasons: SelectionReason[];
};

/**
 * PURE selector — dipakai selftest. Semua input sudah materialized sehingga
 * logika window + alasan bisa diuji tanpa DB.
 */
export function selectDay2Recipients(input: {
  users: MinimalUser[];
  watchCounts: Record<string, number>;   // userId -> Watchlist count
  day0Views: Record<string, number>;     // userId -> PageView count day-0 (non-bot)
  starAdds: Record<string, number>;      // userId -> star_add events day-0..now
  now: Date;
}): SelectedRecipient[] {
  const out: SelectedRecipient[] = [];
  for (const user of input.users) {
    const offset = wibDayOffset(input.now, user.createdAt);
    if (offset < DAY2_MIN_OFFSET_DAYS || offset > DAY2_MAX_OFFSET_DAYS) continue;
    const reasons: SelectionReason[] = [];
    const watch = input.watchCounts[user.id] ?? 0;
    if (watch > 0) reasons.push(`watchlist:${watch}`);
    const views = input.day0Views[user.id] ?? 0;
    if (views > 1) reasons.push(`day0_views:${views}`);
    const stars = input.starAdds[user.id] ?? 0;
    if (stars > 0) reasons.push(`star_add:${stars}`);
    if (reasons.length === 0) continue;
    out.push({ user, reasons });
  }
  return out;
}

/** Dedupe key (AC5): max 1 email per user per hari-job. */
export function recipientKey(userId: string, dateKey: string): string {
  return `${userId}:${dateKey}`;
}

/**
 * PURE builder data email. harga null → baris "harga belum tersedia"
 * (bukan skip, supaya ticker tetap terlihat).
 */
export async function buildRetentionEmailData(input: {
  user: MinimalUser;
  watchTickers: string[];
  priceByTicker: Map<string, { close: number | null; prevClose: number | null }>;
  siteUrl: string;
}): Promise<RetentionEmailData> {
  const watchlistRows: WatchlistEmailRow[] = input.watchTickers.map(t => {
    const p = input.priceByTicker.get(t);
    return { ticker: t, close: p?.close ?? null, prevClose: p?.prevClose ?? null };
  });
  return {
    displayName: input.user.name?.trim() || input.user.username,
    watchlistRows,
    siteUrl: input.siteUrl,
  };
}

// ---------------------------------------------------------------------------
// Prisma orchestration — dipanggil cron route. Tidak di-test langsung;
// perilaku pure-core di selftest, parity via dry-run CronLog.
// ---------------------------------------------------------------------------

export type RetentionEmailJobResult = {
  ranAt: string;
  mode: "dry_run" | "live" | "preview_readonly" | "env_resolved";
  candidates: number;
  recipients: Array<{
    userId: string;
    email: string;
    reasons: string[];
    tickers: string[];
    subject: string;
    sent: boolean;
    mode: string;
    htmlPreview: string; // 200 char pertama utk bukti render
  }>;
  skippedAlreadySent: string[]; // userIds deduped hari ini
  /**
   * Key terkirim (mode live) — DISERTAKAN di result agar CronLog entry
   * job ini menjadi sumber dedupe run berikutnya (AC5).
   */
  sentKeys: string[];
};

export async function runRetentionEmailJob(opts?: {
  now?: Date;
  siteUrl?: string;
  /**
   * undefined (default) = mailer resolve via env: RETENTION_EMAIL_API_KEY
   * terisi + RETENTION_EMAIL_DRY_RUN=0 → kirim nyata; selain itu dry-run.
   * true = paksa dry-run; false = paksa live (hanya utk test sandbox).
   */
  dryRun?: boolean;
  /**
   * Mode preview READ-ONLY (malam / audit): seleksi + render TANPA sendEmail
   * (sendEmail menulis CronLog) dan TANPA mencatat sentKeys. 0 tulis DB.
   */
  readOnly?: boolean;
}): Promise<RetentionEmailJobResult> {
  const now = opts?.now ?? new Date();
  const siteUrl = opts?.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://teknikal.id";
  const dryRun = opts?.dryRun;
  const readOnly = opts?.readOnly ?? false;
  const dateKey = wibDateKey(now);

  // 1) Kandidat window: createdAt dalam 3 hari terakhir (filter offset WIB-hari
  //    dilakukan di pure selector — murah, user baru sedikit).
  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: new Date(now.getTime() - 3 * 86400000) },
      bannedAt: null,
    },
    select: { id: true, email: true, name: true, username: true, createdAt: true },
  });

  // 2) Materialize signals utk kandidat (batch, bukan N+1).
  const ids = users.map(u => u.id);
  const [watchRows, viewRows, starRows] = await Promise.all([
    prisma.watchlist.findMany({ where: { userId: { in: ids } }, select: { userId: true, stockTicker: true } }),
    prisma.pageView.findMany({
      where: { userId: { in: ids }, isBot: false, createdAt: { gte: new Date(now.getTime() - 3 * 86400000) } },
      select: { userId: true, createdAt: true },
    }) as Promise<Array<{ userId: string | null; createdAt: Date }>>,
    prisma.engagementEvent.findMany({
      where: { type: "cta_click", label: "star_add", createdAt: { gte: new Date(now.getTime() - 3 * 86400000) } },
      select: { anonId: true, createdAt: true },
    }),
  ]);

  const watchCounts: Record<string, number> = {};
  const watchTickers: Record<string, string[]> = {};
  for (const w of watchRows) {
    watchCounts[w.userId] = (watchCounts[w.userId] ?? 0) + 1;
    (watchTickers[w.userId] ??= []).push(w.stockTicker);
  }

  // day-0 views: PageView hari kalender WIB yang sama dengan createdAt user.
  const day0Views: Record<string, number> = {};
  const createdAtById = new Map(users.map(u => [u.id, u.createdAt] as const));
  const refinedDay0: Record<string, number> = {};
  for (const v of viewRows) {
    if (!v.userId) continue;
    const created = createdAtById.get(v.userId);
    if (!created) continue;
    if (wibDateKey(v.createdAt) === wibDateKey(created)) {
      refinedDay0[v.userId] = (refinedDay0[v.userId] ?? 0) + 1;
    }
  }

  // star_add: EngagementEvent anonId tidak tertaut userId — v1: user dianggap
  // "punya star_add" bila event terjadi pada hari kalender WIB sama dengan
  // day-0 ATAU day-1 user (proxy kasar, keterbatasan dicatat di queue).
  const starDays = new Set(starRows.map(s => wibDateKey(s.createdAt)));
  const starAdds: Record<string, number> = {};
  for (const u of users) {
    const d0 = wibDateKey(u.createdAt);
    const d1 = wibDateKey(new Date(u.createdAt.getTime() + 86400000));
    if (starDays.has(d0) || starDays.has(d1)) starAdds[u.id] = 1;
  }

  // 3) PURE selection
  const selected = selectDay2Recipients({
    users: users as MinimalUser[],
    watchCounts,
    day0Views: refinedDay0,
    starAdds,
    now,
  });

  // 4) Dedupe via CronLog hari ini (recipientKey tercatat di result job run sebelumnya).
  const todayLogs = await prisma.cronLog.findMany({
    where: { jobName: "retention-email", startedAt: { gte: new Date(now.getTime() - 36 * 3600 * 1000) }, status: "success" },
    select: { result: true },
  });
  const alreadySent = new Set<string>();
  for (const log of todayLogs) {
    const sent = (log.result as { sentKeys?: string[] } | null)?.sentKeys ?? [];
    for (const k of sent) alreadySent.add(k);
  }
  const skippedAlreadySent: string[] = [];

  // 5) Harga watchlist semua penerima — 2 baris terbaru per stockId (pola distinct edb29bb).
  const allTickers = Array.from(new Set(selected.flatMap(s => watchTickers[s.user.id] ?? [])));
  const stocks = allTickers.length
    ? await prisma.stock.findMany({ where: { ticker: { in: allTickers } }, select: { id: true, ticker: true } })
    : [];
  const priceByTicker = new Map<string, { close: number | null; prevClose: number | null }>();
  const stockIdToTicker = new Map(stocks.map(s => [s.id, s.ticker] as const));
  if (stocks.length) {
    // 2 baris terbaru per saham: baris-1 = close terkini, baris-2 = prevClose.
    // (distinct tak bisa ambil 2 baris — jadi fetch 2 teratas per stockId
    // via window kecil: ambil 30 hari terakhir lalu potong di JS; jumlah
    // ticker pantauan user baru kecil (<50), tetap bounded.)
    const since = new Date(now.getTime() - 30 * 86400000);
    const prices = await prisma.stockPrice.findMany({
      where: { stockId: { in: stocks.map(s => s.id) }, date: { gte: since } },
      orderBy: [{ stockId: "asc" }, { date: "desc" }],
      select: { stockId: true, close: true },
    });
    const seenCount = new Map<number, number>();
    for (const p of prices) {
      const n = (seenCount.get(p.stockId) ?? 0) + 1;
      seenCount.set(p.stockId, n);
      if (n === 1) {
        priceByTicker.set(stockIdToTicker.get(p.stockId) ?? "", { close: Number(p.close), prevClose: null });
      } else if (n === 2) {
        const cur = priceByTicker.get(stockIdToTicker.get(p.stockId) ?? "");
        if (cur) cur.prevClose = Number(p.close);
      }
      if (n > 2) continue;
    }
  }

  // 6) Render + kirim (dry-run default).
  const recipients: RetentionEmailJobResult["recipients"] = [];
  const sentKeys: string[] = [];
  for (const sel of selected) {
    const key = recipientKey(sel.user.id, dateKey);
    if (alreadySent.has(key)) {
      skippedAlreadySent.push(sel.user.id);
      continue;
    }
    const tickers = (watchTickers[sel.user.id] ?? []).slice(0, 8);
    const data = await buildRetentionEmailData({ user: sel.user, watchTickers: tickers, priceByTicker, siteUrl });
    const html = renderRetentionEmail(data);
    const subject = `${data.displayName}, pantauanmu hari ini — teknikal.id`;

    if (readOnly) {
      recipients.push({
        userId: sel.user.id,
        email: sel.user.email,
        reasons: sel.reasons,
        tickers,
        subject,
        sent: false,
        mode: "preview_readonly",
        htmlPreview: html.slice(0, 200),
      });
      continue;
    }
    const sendRes = await sendEmail(
      { to: sel.user.email, subject, html, meta: { job: "retention-email", reasons: sel.reasons, tickers } },
      dryRun === undefined ? undefined : { dryRunOverride: dryRun },
    );
    if (sendRes.mode !== "dry_run") sentKeys.push(key);
    recipients.push({
      userId: sel.user.id,
      email: sel.user.email,
      reasons: sel.reasons,
      tickers,
      subject,
      sent: sendRes.delivered,
      mode: sendRes.mode,
      htmlPreview: html.slice(0, 200),
    });
  }

  return {
    ranAt: now.toISOString(),
    mode: readOnly
      ? "preview_readonly"
      : dryRun === true
        ? "dry_run"
        : dryRun === false
          ? "live"
          : "env_resolved",
    candidates: users.length,
    recipients,
    skippedAlreadySent,
    sentKeys,
  };
}
