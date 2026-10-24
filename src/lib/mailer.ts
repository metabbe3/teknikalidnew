/**
 * Mailer terpusat teknikal.id (PRD idea-2026-10-19-1 / AC1).
 *
 * Keputusan CTO: HTTP API via fetch (pola Resend `POST /emails`) — 0 dependency
 * baru; SMTP dianggap out (nodemailer = dep + socket di container).
 *
 * SAFETY: mode DRY-RUN adalah DEFAULT. Tanpa env credential, sendEmail TIDAK
 * mengirim apa pun — hanya mengembalikan payload yang akan dikirim supaya
 * build + QA + job preview jalan TANPA credential (owner-gate: credential &
 * verifikasi SPF/DKIM menunggu owner isi env).
 *
 * Env:
 *   RETENTION_EMAIL_API_KEY  — API key provider (mis. Resend). Kosong = dry-run.
 *   RETENTION_EMAIL_API_URL  — default https://api.resend.com/emails
 *   RETENTION_EMAIL_FROM     — default "teknikal.id <no-reply@teknikal.id>"
 *   RETENTION_EMAIL_DRY_RUN  — "0"/"false" untuk kirim nyata (SAAT key terisi).
 */
import { prisma } from "@/lib/prisma";

export const DRY_RUN_DEFAULT = true;

export type MailerMode = "dry_run" | "sent" | "skipped_no_key";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Disimpan ke CronLog.result utk jejak kirim per-email (reuse CronLog, 0 migrasi). */
  meta?: Record<string, unknown>;
};

export type SendEmailResult = {
  to: string;
  subject: string;
  mode: MailerMode;
  delivered: boolean;
  id: string | null;
  error?: string;
  meta?: Record<string, unknown>;
};

export type MailerConfig = {
  apiKey: string;
  apiUrl?: string;
  from?: string;
  dryRunOverride?: boolean;
};

export function isMailerConfigured(config?: Partial<MailerConfig>): boolean {
  const apiKey = config?.apiKey ?? process.env.RETENTION_EMAIL_API_KEY ?? "";
  return apiKey.trim().length > 0;
}

function resolveDryRun(config?: Partial<MailerConfig>): boolean {
  if (config?.dryRunOverride !== undefined) return config.dryRunOverride;
  const env = (process.env.RETENTION_EMAIL_DRY_RUN ?? "").trim().toLowerCase();
  if (env === "0" || env === "false") return false;
  return DRY_RUN_DEFAULT;
}

function resolveFrom(config?: Partial<MailerConfig>): string {
  return config?.from ?? process.env.RETENTION_EMAIL_FROM ?? "teknikal.id <no-reply@teknikal.id>";
}

function resolveApiUrl(config?: Partial<MailerConfig>): string {
  return config?.apiUrl ?? process.env.RETENTION_EMAIL_API_URL ?? "https://api.resend.com/emails";
}

/**
 * Kirim email via HTTP API. TANPA credential → mode dry_run (payload di-log,
 * tidak ada network call). Dengan credential + RETENTION_EMAIL_DRY_RUN=0 →
 * kirim nyata. Semua hasil (termasuk dry-run) di-log ke CronLog utk jejak.
 */
export async function sendEmail(
  input: SendEmailInput,
  config?: Partial<MailerConfig>,
): Promise<SendEmailResult> {
  const apiKey = config?.apiKey ?? process.env.RETENTION_EMAIL_API_KEY ?? "";
  const dryRun = resolveDryRun(config);
  const from = resolveFrom(config);
  const apiUrl = resolveApiUrl(config);

  const base: SendEmailResult = {
    to: input.to,
    subject: input.subject,
    mode: dryRun ? "dry_run" : "sent",
    delivered: false,
    id: null,
    meta: input.meta,
  };

  // DRY-RUN: tidak kirim, tidak network — cukup payload utk QA/preview.
  // Tanpa credential pun mode tetap "dry_run" (dry-run adalah default);
  // "skipped_no_key" hanya utk kasus eksplisit: live diminta tapi key kosong.
  if (dryRun) {
    logSendFireAndForget({ ...base, payload: { from, apiUrl, htmlLength: input.html.length, hasApiKey: apiKey.length > 0 } });
    return base;
  }
  if (!apiKey) {
    const noKey: SendEmailResult = { ...base, mode: "skipped_no_key", error: "RETENTION_EMAIL_API_KEY kosong (owner-gate)" };
    logSendFireAndForget(noKey);
    return noKey;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    if (!res.ok) {
      const failed: SendEmailResult = {
        ...base,
        mode: "sent",
        error: `HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`,
      };
      logSendFireAndForget(failed);
      return failed;
    }
    const ok: SendEmailResult = { ...base, mode: "sent", delivered: true, id: body.id ?? null };
    logSendFireAndForget(ok);
    return ok;
  } catch (e) {
    const errRes: SendEmailResult = {
      ...base,
      mode: "sent",
      error: e instanceof Error ? e.message : String(e),
    };
    logSendFireAndForget(errRes);
    return errRes;
  }
}

/** Jejak kirim per-email → CronLog jobName "email:send" (reuse, 0 migrasi). Fire-and-forget. */
function logSendFireAndForget(result: SendEmailResult & { payload?: Record<string, unknown> }): void {
  try {
    void prisma.cronLog.create({
      data: {
        jobName: "email:send",
        status: result.delivered ? "success" : result.error ? "failed" : "dry_run",
        durationMs: 0,
        result: {
          to: result.to,
          subject: result.subject,
          mode: result.mode,
          delivered: result.delivered,
          providerId: result.id,
          error: result.error ?? null,
          ...result.meta,
          ...(result.payload ?? {}),
        },
        triggeredBy: "job",
      },
    }).catch(() => undefined);
  } catch {
    // logging tak boleh gagalkan kirim
  }
}

// ---------------------------------------------------------------------------
// Template email retention day-2 (AC3) — sinyal daftar SAMA dgn
// src/components/home/for-you-signals.tsx (jangan duplikasi daftar lain).
// ---------------------------------------------------------------------------

export type WatchlistEmailRow = {
  ticker: string;
  close: number | null;
  prevClose: number | null;
};

export type RetentionEmailData = {
  displayName: string;
  watchlistRows: WatchlistEmailRow[];
  siteUrl: string;
};

const SIGNAL_LINKS: Array<{ href: string; label: string; desc: string }> = [
  { href: "/saham-golden-cross", label: "Saham Golden Cross Hari Ini", desc: "MA50 baru memotong ke atas MA200 — momentum bullish." },
  { href: "/saham-oversold", label: "Saham Oversold Hari Ini", desc: "RSI di bawah 30 — kandidat rebound." },
  { href: "/saham-volume-spike", label: "Saham Volume Spike Hari Ini", desc: "Volume >3× rata-rata 20 hari." },
];

/** chg% 1 desimal, koma desimal-ID; null bila tak bisa dihitung. */
export function chgPct(close: number | null, prevClose: number | null): string | null {
  if (close === null || prevClose === null || prevClose === 0) return null;
  const pct = ((close - prevClose) / prevClose) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")}%`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtRp(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Template HTML statis (tanpa asset eksternal) — render preview-able di browser. */
export function renderRetentionEmail(data: RetentionEmailData): string {
  const base = data.siteUrl.replace(/\/+$/, "");
  const rowsHtml = data.watchlistRows
    .map(r => {
      const pct = chgPct(r.close, r.prevClose);
      const pctHtml = pct === null
        ? `<span style="color:#6b7280">—</span>`
        : `<span style="color:${pct.startsWith("+") ? "#16a34a" : pct.startsWith("-") ? "#dc2626" : "#6b7280"};font-weight:600">${esc(pct)}</span>`;
      const priceHtml = r.close === null
        ? `<span style="color:#6b7280">harga belum tersedia</span>`
        : `${esc(fmtRp(r.close))}`;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">
          <a href="${base}/stocks/${encodeURIComponent(r.ticker)}?utm_source=retention&amp;utm_medium=email" style="color:#111;font-weight:700;text-decoration:none">${esc(r.ticker.replace(".JK", ""))}</a>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${priceHtml}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${pctHtml}</td>
      </tr>`;
    })
    .join("\n");

  const signalsHtml = SIGNAL_LINKS.map(s => `
      <li style="margin:0 0 10px 0">
        <a href="${base}${s.href}?utm_source=retention&amp;utm_medium=email" style="color:#111;font-weight:600">${esc(s.label)} →</a>
        <div style="color:#6b7280;font-size:13px">${esc(s.desc)}</div>
      </li>`).join("\n");

  const unsubMailto = "mailto:no-reply@teknikal.id?subject=berhenti%20email%20pantauan";

  return `<!doctype html>
<html lang="id"><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="font-size:13px;color:#6b7280;margin-bottom:16px">teknikal.id — pantauan sahammu</div>
  <h1 style="font-size:20px;margin:0 0 4px 0">Halo ${esc(data.displayName)},</h1>
  <p style="color:#374151;margin:8px 0 20px 0">Ini ringkasan pantauanmu. Klik ticker utk lihat halaman analisa lengkap.</p>

  <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:8px">
    <thead><tr>
      <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #eee;font-size:12px;color:#6b7280">EMITEN</th>
      <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #eee;font-size:12px;color:#6b7280">CLOSE</th>
      <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #eee;font-size:12px;color:#6b7280">PERUBAHAN</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <h2 style="font-size:16px;margin:24px 0 8px 0">Sinyal minggu ini</h2>
  <ul style="list-style:none;padding:0;margin:0">${signalsHtml}</ul>

  <div style="margin:24px 0;text-align:center">
    <a href="${base}/watchlist?utm_source=retention&amp;utm_medium=email" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Buka teknikal.id</a>
  </div>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px">
    Kamu menerima email ini karena akun teknikal.id-mu baru dibuat 1–2 hari lalu dan memiliki pantauan aktif.<br>
    Tidak ingin menerima email ini lagi? <a href="${unsubMailto}" style="color:#6b7280">Berhenti berlangganan</a> (balas subjek tetap diproses manual).
  </p>
</div>
</body></html>`;
}
