import { prisma } from "@/lib/prisma";
import { wibDayKey } from "@/lib/datetime-wib";
import { articleRepository } from "@/domains/article/article.repository";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { pasarLiveService, isWibWeekday, wibNow } from "@/domains/stock/pasar-live.service";

const BASE_URL = "https://teknikal.id";

/**
 * Standarisasi URL ber-UTM untuk seluruh link keluar dari bot Telegram ke web teknikal.id.
 * Selalu menyetel utm_source=telegram, utm_medium=bot, dan utm_campaign=<campaign>
 * tanpa merusak query parameter yang sudah ada.
 */
export function tgWebUrl(pathOrUrl: string, campaign = "bot_link"): string {
  const url = new URL(pathOrUrl || "/", BASE_URL);
  url.searchParams.set("utm_source", "telegram");
  url.searchParams.set("utm_medium", "bot");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

/**
 * Menghasilkan kunci idempoten harian WIB untuk deduplikasi pengiriman digest di TelegramSent.
 */
export function buildDigestKind(date: Date = new Date()): string {
  return `digest:${wibDayKey(date)}`;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripJk(ticker: string): string {
  return ticker.replace(/\.JK$/i, "").toUpperCase();
}

function fmtPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "0,00%";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2).replace(".", ",")}%`;
}

export interface DigestBuildInput {
  brief?: {
    slug: string;
    title: string;
    excerpt?: string | null;
  } | null;
  recentArticles?: Array<{
    slug: string;
    title: string;
    tickerTag?: string | null;
  }>;
  breadth: {
    advancersCount: number;
    declinersCount: number;
    unchangedCount: number;
  };
  topMovers: Array<{
    ticker: string;
    name?: string;
    close: number | null;
    changePercent: number | null;
    signalScore?: number | null;
    signalLabel?: string | null;
  }>;
  sessionDate?: string | null;
}

export interface DigestPayload {
  html: string;
  replyMarkup: {
    inline_keyboard: Array<Array<{ text: string; url: string }>>;
  };
}

/**
 * Fungsi murni (pure function) untuk menyusun konten HTML + inline keyboard digest harian.
 * Seluruh link menuju teknikal.id dijamin memiliki ?utm_source=telegram&utm_medium=bot&utm_campaign=daily_digest.
 */
export function buildDailyDigestMessage(input: DigestBuildInput): DigestPayload {
  const lines: string[] = [];

  const dateLabel = input.sessionDate ? ` (${escapeHtml(input.sessionDate)})` : "";
  lines.push(`📊 <b>Digest Pasar BEI Hari Ini${dateLabel}</b>`);
  lines.push("");

  // 1. Breadth pasar
  const { advancersCount, declinersCount, unchangedCount } = input.breadth;
  lines.push(
    `📈 <b>Breadth Pasar:</b> 🟢 ${advancersCount} Naik · 🔴 ${declinersCount} Turun · ⚪ ${unchangedCount} Tetap`,
  );

  // 2. Sinyal & Mover Terkuat (Top 3)
  if (input.topMovers.length > 0) {
    lines.push("");
    lines.push("🔥 <b>Sinyal &amp; Penggerak Terkuat:</b>");
    for (const m of input.topMovers.slice(0, 3)) {
      const code = stripJk(m.ticker);
      const fullTicker = m.ticker.toUpperCase().endsWith(".JK") ? m.ticker.toUpperCase() : `${code}.JK`;
      const stockLink = tgWebUrl(`/stocks/${fullTicker}`, "daily_digest");
      const priceStr = m.close !== null ? `Rp${Math.round(m.close).toLocaleString("id-ID")}` : "-";
      const pctStr = fmtPct(m.changePercent);
      const scoreBadge =
        m.signalScore !== null && m.signalScore !== undefined
          ? ` · Skor ${m.signalScore >= 0 ? "+" : ""}${m.signalScore.toFixed(2).replace(".", ",")}${
              m.signalLabel ? ` (${escapeHtml(m.signalLabel)})` : ""
            }`
          : "";
      lines.push(`• <a href="${stockLink}"><b>${escapeHtml(code)}</b></a> ${priceStr} (${pctStr})${scoreBadge}`);
    }
  }

  // 3. Brief Utama & Artikel Terbaru (2-3 artikel)
  const articlesToRender: Array<{ slug: string; title: string; isBrief?: boolean }> = [];
  if (input.brief) {
    articlesToRender.push({ slug: input.brief.slug, title: input.brief.title, isBrief: true });
  }
  for (const a of input.recentArticles ?? []) {
    if (articlesToRender.length >= 3) break;
    if (!articlesToRender.some((x) => x.slug === a.slug)) {
      articlesToRender.push({ slug: a.slug, title: a.title });
    }
  }

  if (articlesToRender.length > 0) {
    lines.push("");
    lines.push("📰 <b>Riset &amp; Brief Terbaru:</b>");
    for (const art of articlesToRender) {
      const artLink = tgWebUrl(`/berita/${art.slug}`, "daily_digest");
      lines.push(`• <a href="${artLink}">${escapeHtml(art.title)}</a>`);
    }
  }

  // 4. Footer & CTA
  const pasarLink = tgWebUrl("/pasar", "daily_digest");
  lines.push("");
  lines.push(`👉 Pantau lengkap di <a href="${pasarLink}">Koran Pasar Live</a>`);
  lines.push("<i>Data harian teknikal.id — edukasi, bukan rekomendasi jual-beli.</i>");

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "📊 Buka Radar Saham",
          url: tgWebUrl("/stocks?view=pasar", "daily_digest"),
        },
        {
          text: "💬 Tanya AI Sahammu (Gratis 3x)",
          url: "https://t.me/TeknikalidAgentBot?start=kopi_pasar",
        },
      ],
    ],
  };

  return {
    html: lines.join("\n"),
    replyMarkup,
  };
}

export interface RunDailyDigestOptions {
  force?: boolean;
  dryRun?: boolean;
}

export interface RunDailyDigestResult {
  ok: boolean;
  skipped?: string;
  kind?: string;
  dryRun?: boolean;
  totalTargets?: number;
  alreadySent?: number;
  sentCount?: number;
  deactivatedCount?: number;
  failedCount?: number;
  previewHtml?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectSubscriberChatIds(): Promise<string[]> {
  const chatSet = new Set<string>();

  const channelId = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (channelId) {
    chatSet.add(channelId);
  }

  // 1. Cek apakah ada tabel TelegramSubscriber (forward-compatible) atau TelegramWatch + agent.agent_user
  try {
    const watchRows = await prisma.telegramWatch.findMany({
      where: { active: true },
      select: { chatId: true },
      distinct: ["chatId"],
    });
    for (const r of watchRows) {
      if (r.chatId) chatSet.add(String(r.chatId).trim());
    }
  } catch (err) {
    console.warn("[tg-digest] telegramWatch query failed:", err);
  }

  try {
    const agentUsers = await prisma.$queryRaw<Array<{ chat_id: bigint | number | string }>>`
      SELECT DISTINCT u.chat_id
      FROM agent.agent_user u
      LEFT JOIN agent.agent_digest_pref p ON p.chat_id = u.chat_id
      WHERE u.state = 'active'
        AND COALESCE(p.watchlist_digest, true) = true
        AND COALESCE(p.digest_slots, 'std') <> 'off'
    `;
    for (const r of agentUsers) {
      if (r.chat_id !== null && r.chat_id !== undefined) {
        chatSet.add(String(r.chat_id).trim());
      }
    }
  } catch {
    // Tabel agent.agent_user opsional bila DB lokal tanpa skema agent
  }

  return Array.from(chatSet).filter(Boolean);
}

async function deactivateBlockedSubscriber(chatId: string): Promise<void> {
  try {
    await prisma.telegramWatch.updateMany({
      where: { chatId },
      data: { active: false },
    });
  } catch {
    // ignore
  }
}

export const telegramDigestService = {
  tgWebUrl,
  buildDigestKind,
  buildDailyDigestMessage,

  async runDailyDigest(options: RunDailyDigestOptions = {}): Promise<RunDailyDigestResult> {
    const { force = false, dryRun = false } = options;
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

    if (!token && !dryRun) {
      return { ok: false, skipped: "missing_token" };
    }

    const now = new Date();
    if (!force && !isWibWeekday(wibNow())) {
      return { ok: false, skipped: "weekend" };
    }

    const kind = buildDigestKind(now);

    // Ambil data pasar hari ini via SATU PINTU
    const [brief, recentNews, overview, recap] = await Promise.all([
      articleRepository.findLatestDailyBrief().catch(() => null),
      articleRepository.findPublishedPaginated({ limit: 3 }).catch(() => []),
      stockMarketService.getMarketOverview().catch(() => null),
      pasarLiveService.getYesterdayRecap().catch(() => null),
    ]);

    const hasMarketData =
      overview &&
      (overview.advancersCount + overview.declinersCount + overview.unchangedCount > 0 ||
        overview.gainers.length > 0);

    if (!hasMarketData && (!recap || recap.topSignals.length === 0)) {
      return { ok: false, skipped: "no_market_data", kind };
    }

    const topSignals = recap?.topSignals?.slice(0, 3) ?? [];
    const topMovers =
      topSignals.length > 0
        ? topSignals.map((s) => ({
            ticker: s.ticker,
            name: s.name,
            close: s.close,
            changePercent: s.changePercent,
            signalScore: s.signalScore,
            signalLabel: s.signalLabel,
          }))
        : (overview?.gainers ?? []).slice(0, 3).map((g) => ({
            ticker: g.ticker,
            name: g.name,
            close: g.close,
            changePercent: g.changePercent,
            signalScore: null,
            signalLabel: null,
          }));

    const messagePayload = buildDailyDigestMessage({
      brief,
      recentArticles: recentNews.slice(0, 3).map((a) => ({
        slug: a.slug,
        title: a.title,
        tickerTag: a.tickerTag,
      })),
      breadth: {
        advancersCount: overview?.advancersCount ?? 0,
        declinersCount: overview?.declinersCount ?? 0,
        unchangedCount: overview?.unchangedCount ?? 0,
      },
      topMovers,
      sessionDate: recap?.sessionDate ?? null,
    });

    // Kumpulkan target penerima & filter yang sudah dikirim hari ini
    const allChatIds = await collectSubscriberChatIds();
    const sentRows = await prisma.telegramSent
      .findMany({
        where: { slug: kind },
        select: { chatId: true },
      })
      .catch(() => [] as Array<{ chatId: string }>);

    const sentSet = new Set(sentRows.map((r) => r.chatId));
    const pendingTargets = allChatIds.filter((id) => !sentSet.has(id));

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        kind,
        totalTargets: allChatIds.length,
        alreadySent: sentSet.size,
        sentCount: 0,
        deactivatedCount: 0,
        failedCount: 0,
        previewHtml: messagePayload.html,
      };
    }

    if (pendingTargets.length === 0) {
      return {
        ok: true,
        skipped: "already_sent_all",
        kind,
        totalTargets: allChatIds.length,
        alreadySent: sentSet.size,
        sentCount: 0,
      };
    }

    let sentCount = 0;
    let deactivatedCount = 0;
    let failedCount = 0;
    const apiBase = `https://api.telegram.org/bot${token}`;

    for (let i = 0; i < pendingTargets.length; i++) {
      const chatId = pendingTargets[i];
      if (i > 0) {
        await sleep(45); // Throttle ~22 pesan/detik (<30 msg/dtk limit Telegram)
      }

      // Double-check tepat sebelum kirim (cegah race antar proses)
      const exists = await prisma.telegramSent
        .findUnique({
          where: { chatId_slug: { chatId, slug: kind } },
          select: { chatId: true },
        })
        .catch(() => null);
      if (exists) {
        continue;
      }

      try {
        const res = await fetch(`${apiBase}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: messagePayload.html,
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
            reply_markup: messagePayload.replyMarkup,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (res.ok) {
          await prisma.telegramSent
            .upsert({
              where: { chatId_slug: { chatId, slug: kind } },
              create: { chatId, slug: kind },
              update: {},
            })
            .catch((e) => console.error("[tg-digest] telegramSent write failed:", e));

          // Catat juga metrik funnel_digestSent ke EngagementEvent agar funnel terukur
          await prisma.engagementEvent
            .create({
              data: {
                anonId: "00000000-0000-0000-0000-000000000000",
                path: "/api/cron/telegram-digest",
                type: "cta_click",
                label: "funnel_digestSent",
                valueNum: 1,
              },
            })
            .catch(() => {});

          sentCount++;
        } else if (res.status === 403) {
          await deactivateBlockedSubscriber(chatId);
          deactivatedCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error(`[tg-digest] send error for chat ${chatId}:`, err);
        failedCount++;
      }
    }

    return {
      ok: true,
      kind,
      totalTargets: allChatIds.length,
      alreadySent: sentSet.size,
      sentCount,
      deactivatedCount,
      failedCount,
    };
  },
};
