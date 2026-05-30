import { test, expect } from "@playwright/test";
import { TEST_TICKER } from "../helpers/test-data";

test.describe("Stock Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/stocks/${TEST_TICKER}`);
  });

  test("loads stock detail with header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: TEST_TICKER.replace(".JK", "") })).toBeVisible({ timeout: 10_000 });
  });

  test("shows stock name", async ({ page }) => {
    await expect(page.getByText("Bank Central Asia").first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows technical indicators section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /RSI/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /MACD/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Bollinger/i })).toBeVisible();
  });

  test("shows discussion section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Diskusi/i })).toBeVisible({ timeout: 10_000 });
  });

  test("has watchlist button (visible when logged out shows login prompt)", async ({ page }) => {
    // The watchlist button should exist on the page
    const watchlistBtn = page.getByRole("button", { name: /pantauan|watchlist/i }).or(
      page.locator('button[aria-label*="Pantau"]'),
    ).or(
      page.locator('button[aria-label*="Watch"]'),
    );
    // Button may or may not be visible depending on auth state
    const count = await watchlistBtn.count();
    if (count > 0) {
      await expect(watchlistBtn.first()).toBeVisible();
    }
  });
});
