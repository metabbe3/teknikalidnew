import { test, expect } from "@playwright/test";

test.describe("Stocks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/stocks");
  });

  test("loads with stock table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Daftar Saham/i })).toBeVisible();
  });

  test("shows stock data in table rows", async ({ page }) => {
    const stockLinks = page.locator('a[href^="/stocks/"]').first();
    await expect(stockLinks).toBeVisible({ timeout: 10_000 });
    const allLinks = page.locator('a[href^="/stocks/"]');
    const count = await allLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a stock navigates to detail page", async ({ page }) => {
    const stockLink = page.locator('a[href*="/stocks/"]').first();
    await expect(stockLink).toBeVisible({ timeout: 10_000 });
    const href = await stockLink.getAttribute("href");
    expect(href).toMatch(/\/stocks\/[A-Z]+\.JK/);
    await stockLink.click();
    await expect(page).toHaveURL(/\/stocks\/[A-Z]+\.JK/);
  });
});
