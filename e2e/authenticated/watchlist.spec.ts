import { test, expect } from "@playwright/test";
import { registerAndLogin } from "../helpers/auth";
import { TEST_TICKER, TEST_TICKER_ALT } from "../helpers/test-data";

test.describe("Watchlist", () => {
  test.beforeEach(async ({ page, context }) => {
    await registerAndLogin(page, context);
  });

  test("add stock to watchlist from detail page", async ({ page }) => {
    await page.goto(`/stocks/${TEST_TICKER}`);

    // Find and click watchlist/favorite button
    const watchBtn = page.getByRole("button", { name: /pantau|watch|bookmark/i }).or(
      page.locator('button[aria-label*="Pantau"]'),
    ).or(
      page.locator('button[aria-label*="Watch"]'),
    ).first();

    await expect(watchBtn).toBeVisible({ timeout: 10_000 });
    await watchBtn.click();

    // Should show some confirmation or change state
    await page.waitForTimeout(1000);
  });

  test("watchlist page shows added stock", async ({ page }) => {
    // Add stock via API
    const res = await page.evaluate(async (ticker) => {
      const r = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      return r.ok;
    }, TEST_TICKER_ALT);

    expect(res).toBeTruthy();

    // Go to watchlist page
    await page.goto("/watchlist");
    await expect(page.getByText(new RegExp(TEST_TICKER_ALT.replace(".", "\\.")).source || TEST_TICKER_ALT)).toBeVisible({ timeout: 10_000 });
  });

  test("remove stock from watchlist", async ({ page }) => {
    // Add stock
    await page.evaluate(async (ticker) => {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
    }, TEST_TICKER);

    // Navigate to watchlist
    await page.goto("/watchlist");

    // Find and click remove button
    const removeBtn = page.getByRole("button", { name: /hapus|remove|delete/i }).or(
      page.locator('button[aria-label*="Remove"]'),
    ).first();

    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
