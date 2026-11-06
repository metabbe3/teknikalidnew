import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tgWebUrl as mjsTgWebUrl } from "../../../../scripts/telegram-bot/utm.mjs";
import {
  tgWebUrl,
  buildDigestKind,
  buildDailyDigestMessage,
} from "../telegram-digest.service";
import { categorizeTraffic } from "../../analytics/analytics.service";

describe("FASE T5: Telegram UTM Builder & Daily Digest Generator", () => {
  it("tgWebUrl menambahkan utm_source=telegram, utm_medium=bot, dan utm_campaign default pada path biasa", () => {
    const url = tgWebUrl("/stocks/BBCA.JK");
    assert.equal(
      url,
      "https://teknikal.id/stocks/BBCA.JK?utm_source=telegram&utm_medium=bot&utm_campaign=bot_link",
    );
    assert.equal(mjsTgWebUrl("/stocks/BBCA.JK"), url);
  });

  it("tgWebUrl mempertahankan query parameter yang sudah ada (mis. ?view=pasar) dan menyetel campaign spesifik", () => {
    const url = tgWebUrl("/stocks?view=pasar", "daily_digest");
    assert.equal(
      url,
      "https://teknikal.id/stocks?view=pasar&utm_source=telegram&utm_medium=bot&utm_campaign=daily_digest",
    );
    assert.equal(mjsTgWebUrl("/stocks?view=pasar", "daily_digest"), url);
  });

  it("buildDigestKind menghitung kunci idempoten harian berbasis tanggal WIB (UTC+7)", () => {
    // 2026-11-06 18:30 UTC = 2026-11-07 01:30 WIB
    const utcLate = new Date("2026-11-06T18:30:00.000Z");
    assert.equal(buildDigestKind(utcLate), "digest:2026-11-07");

    // 2026-11-06 09:50 UTC = 2026-11-06 16:50 WIB
    const utcAfternoon = new Date("2026-11-06T09:50:00.000Z");
    assert.equal(buildDigestKind(utcAfternoon), "digest:2026-11-06");
  });

  it("buildDailyDigestMessage menyusun HTML ringkas dengan seluruh link web ber-UTM daily_digest dan 2 tombol CTA", () => {
    const payload = buildDailyDigestMessage({
      sessionDate: "2026-11-06",
      breadth: {
        advancersCount: 312,
        declinersCount: 210,
        unchangedCount: 185,
      },
      topMovers: [
        {
          ticker: "BBCA.JK",
          name: "Bank Central Asia",
          close: 10250,
          changePercent: 2.5,
          signalScore: 0.72,
          signalLabel: "Beli Kuat",
        },
        {
          ticker: "FORU.JK",
          name: "Fortune Indonesia",
          close: 420,
          changePercent: 8.24,
          signalScore: 0.65,
          signalLabel: "Beli",
        },
      ],
      brief: {
        slug: "brief-pasar-6-november-2026",
        title: "IHSG Menguat Didorong Sektor Perbankan",
      },
      recentArticles: [
        {
          slug: "analisa-bbca-november",
          title: "Analisa Teknikal BBCA Uji Resistance",
          tickerTag: "BBCA.JK",
        },
      ],
    });

    assert.ok(payload.html.includes("312 Naik"));
    assert.ok(payload.html.includes("210 Turun"));
    assert.ok(
      payload.html.includes(
        'href="https://teknikal.id/stocks/BBCA.JK?utm_source=telegram&utm_medium=bot&utm_campaign=daily_digest"',
      ),
    );
    assert.ok(
      payload.html.includes(
        'href="https://teknikal.id/berita/brief-pasar-6-november-2026?utm_source=telegram&utm_medium=bot&utm_campaign=daily_digest"',
      ),
    );
    assert.ok(
      payload.html.includes(
        'href="https://teknikal.id/berita/analisa-bbca-november?utm_source=telegram&utm_medium=bot&utm_campaign=daily_digest"',
      ),
    );

    const buttons = payload.replyMarkup.inline_keyboard[0];
    assert.equal(buttons.length, 2);
    assert.equal(
      buttons[0].url,
      "https://teknikal.id/stocks?view=pasar&utm_source=telegram&utm_medium=bot&utm_campaign=daily_digest",
    );
    assert.equal(buttons[1].url, "https://t.me/TeknikalidAgentBot?start=kopi_pasar");
  });

  it("categorizeTraffic mengenali utm_source=telegram, tg, dan tg_digest sebagai platform Telegram", () => {
    assert.deepEqual(categorizeTraffic(null, "telegram"), {
      source: "social",
      platform: "Telegram",
    });
    assert.deepEqual(categorizeTraffic(null, "tg"), {
      source: "social",
      platform: "Telegram",
    });
    assert.deepEqual(categorizeTraffic(null, "tg_digest"), {
      source: "social",
      platform: "Telegram",
    });
  });
});
