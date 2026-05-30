import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads with hero section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Analisa Teknikal/i })).toBeVisible();
  });

  test('has "Lihat Saham" button linking to /stocks', async ({ page }) => {
    const link = page.getByRole("link", { name: /Lihat Saham/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/stocks");
  });

  test("shows top gainers in featured stocks", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Saham Paling Aktif" })).toBeVisible();
  });

  test("shows sectors section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Performa Sektor" })).toBeVisible();
  });

  test("shows interactive tool previews", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Coba Langsung" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Screener Teknikal" })).toBeVisible();
  });

  test("shows platform features section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Fitur Platform" })).toBeVisible();
  });

  test("shows tracking info in hero", async ({ page }) => {
    await expect(page.getByText(/Tracking/i).first()).toBeVisible();
  });

  test("stock cards link to detail pages", async ({ page }) => {
    const stockLinks = page.locator('a[href^="/stocks/"]');
    const count = await stockLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("ticker tape is visible", async ({ page }) => {
    const ticker = page.locator(".ticker-tape").first();
    await expect(ticker).toBeVisible();
  });
});
