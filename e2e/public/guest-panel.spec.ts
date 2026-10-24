/**
 * E2E PRD idea-2026-10-19-2 / task prd-2026-10-22-02 — panel 'Pantauan perangkat ini' (/stocks).
 * Guest-only; read-only terhadap DB: semua POST /api di-block via page.route
 * (telemetri pageview/engagement tak boleh menulis ke DB saat e2e).
 * CATATAN: addInitScript berlaku utk SETIAP navigasi — hanya dipakai di test
 * single-navigasi; test multi-navigasi seed via evaluate + reload.
 */
import { test, expect, type Page } from "@playwright/test";

const TWO = ["BBCA.JK", "BBRI.JK"];

async function blockPostWrites(page: Page) {
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    (route) => (route.request().method() === "POST" ? route.abort() : route.continue()),
  );
}

test.describe("Guest watchlist panel (/stocks) — prd-2026-10-22-02", () => {
  test.beforeEach(async ({ page }) => {
    await blockPostWrites(page);
  });

  test("AC1: panel render utk guest dgn 2 item ticker + CTA register", async ({ page }) => {
    await page.addInitScript((tickers) => {
      window.localStorage.setItem("guest_watchlist", JSON.stringify(tickers));
    }, TWO);
    await page.goto("/stocks");
    const panel = page.locator('section[aria-label="Pantauan perangkat ini"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Pantauan perangkat ini" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "BBCA", exact: true })).toBeVisible();
    await expect(panel.getByRole("link", { name: "BBRI", exact: true })).toBeVisible();
    await expect(panel.getByText(/2 emiten dipantau di perangkat ini/i)).toBeVisible();
    await expect(panel.getByRole("link", { name: /Simpan permanen/i })).toHaveCount(1);
  });

  test("AC1-sync: hapus item dari panel → jumlah & daftar update live", async ({ page }) => {
    await page.addInitScript((tickers) => {
      window.localStorage.setItem("guest_watchlist", JSON.stringify(tickers));
    }, TWO);
    await page.goto("/stocks");
    const panel = page.locator('section[aria-label="Pantauan perangkat ini"]');
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: /Hapus BBRI/i }).click();
    await expect(panel.getByRole("link", { name: "BBRI", exact: true })).toHaveCount(0);
    await expect(panel.getByText(/1 emiten dipantau/i)).toBeVisible();
  });

  test("AC1-negative: panel TIDAK render saat kosong (visitor baru tanpa star)", async ({ page }) => {
    await page.goto("/stocks");
    await expect(page.locator('section[aria-label="Pantauan perangkat ini"]')).toHaveCount(0);
  });

  test("AC2-flow: toggle star di halaman detail → chip muncul → panel di /stocks menerima update", async ({ page }) => {
    // Mulai dari storage kosong (evaluate + reload — bukan addInitScript yang
    // akan berlari lagi di navigasi berikutnya)
    await page.goto("/stocks/TLKM.JK");
    await page.evaluate(() => window.localStorage.removeItem("guest_watchlist"));
    await page.reload();

    const star = page.getByRole("button", { name: /Pantau TLKM/i });
    await star.click();
    await expect(page.getByRole("status").filter({ hasText: /Tersimpan — 1 emiten/i })).toBeVisible();

    await page.goto("/stocks");
    const panel = page.locator('section[aria-label="Pantauan perangkat ini"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "TLKM", exact: true })).toBeVisible();
  });
});
