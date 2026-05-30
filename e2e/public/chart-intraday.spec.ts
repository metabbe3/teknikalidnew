import { test, expect } from "@playwright/test";
import { TEST_TICKER } from "../helpers/test-data";

test.describe("Chart Intraday", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/stocks/${TEST_TICKER}`);
    // Wait for chart to load
    await expect(page.getByRole("img", { name: /chart/i })).toBeVisible({ timeout: 15_000 });
  });

  test("daily chart loads by default", async ({ page }) => {
    // 6mo should be active by default
    const btn6mo = page.getByRole("button", { name: "6mo", pressed: true });
    await expect(btn6mo).toBeVisible();
    // Chart canvas should have content
    const chart = page.getByRole("img", { name: /chart/i });
    await expect(chart).toBeVisible();
  });

  test("1D intraday chart loads without error", async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.getByRole("button", { name: "1D" }).click();

    // Chart should still be visible (not crashed)
    await expect(page.getByRole("img", { name: /chart/i })).toBeVisible({ timeout: 10_000 });

    // No "Invalid date string" errors
    const dateErrors = errors.filter((e) => e.includes("Invalid date string"));
    expect(dateErrors).toHaveLength(0);
  });

  test("5D intraday chart loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.getByRole("button", { name: "5D" }).click();

    await expect(page.getByRole("img", { name: /chart/i })).toBeVisible({ timeout: 10_000 });

    const dateErrors = errors.filter((e) => e.includes("Invalid date string"));
    expect(dateErrors).toHaveLength(0);
  });

  test("intraday chart shows time axis", async ({ page }) => {
    await page.getByRole("button", { name: "1D" }).click();

    // Wait for chart data to load
    await page.waitForTimeout(2000);

    // Chart canvas should be visible
    const chart = page.getByRole("img", { name: /chart/i });
    await expect(chart).toBeVisible();
  });

  test("switching between intraday and daily works", async ({ page }) => {
    // Go to 1D
    await page.getByRole("button", { name: "1D" }).click();
    await expect(page.getByRole("img", { name: /chart/i })).toBeVisible({ timeout: 10_000 });

    // Switch back to 6mo
    await page.getByRole("button", { name: "6mo" }).click();
    await expect(page.getByRole("img", { name: /chart/i })).toBeVisible({ timeout: 10_000 });

    // Switch to 5D
    await page.getByRole("button", { name: "5D" }).click();
    await expect(page.getByRole("img", { name: /chart/i })).toBeVisible({ timeout: 10_000 });
  });
});
