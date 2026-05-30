import { test, expect } from "@playwright/test";

test.describe("Akademi", () => {
  test("akademi index page renders", async ({ page }) => {
    await page.goto("/akademi");
    await expect(page.getByRole("heading", { name: "Akademi", level: 1 })).toBeVisible();
    await expect(page.locator("#main-content").getByText("Panduan dan edukasi")).toBeVisible();
  });

  test("akademi page has correct meta title", async ({ page }) => {
    await page.goto("/akademi");
    await expect(page).toHaveTitle(/Akademi Trading — TeknikalID/);
  });

  test("akademi nav link is visible in header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").getByRole("link", { name: "Akademi", exact: true })).toBeVisible();
  });

  test("akademi nav link navigates to correct page", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Akademi", exact: true }).click();
    await expect(page).toHaveURL("/akademi");
  });

  test("non-existent article shows not found", async ({ page }) => {
    await page.goto("/akademi/non-existent-article-slug");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
