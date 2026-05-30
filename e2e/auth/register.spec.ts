import { test, expect } from "@playwright/test";
import { uniqueEmail } from "../helpers/test-data";

test.describe("Registration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/register");
  });

  test("register page loads with form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Daftar/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
  });

  test("register page shows Google OAuth button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });

  test("register page has link to signin", async ({ page }) => {
    const link = page.locator("main").getByRole("link", { name: /Masuk/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/auth/signin");
  });

  test("register with valid data redirects to complete-profile", async ({ page }) => {
    const email = uniqueEmail();
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("testpassword123");
    await page.locator("#confirmPassword").fill("testpassword123");
    await page.getByRole("button", { name: "Daftar" }).click();

    await expect(page).toHaveURL(/\/auth\/complete-profile/, { timeout: 15_000 });
  });

  test("register with mismatched passwords shows client error", async ({ page }) => {
    const email = uniqueEmail();
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("testpassword123");
    await page.locator("#confirmPassword").fill("differentpassword");
    await page.getByRole("button", { name: "Daftar" }).click();

    await expect(page.getByText(/tidak cocok/i)).toBeVisible({ timeout: 5_000 });
  });

  test("register with short password shows error", async ({ page }) => {
    const email = uniqueEmail();
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("short");
    await page.locator("#confirmPassword").fill("short");
    await page.getByRole("button", { name: "Daftar" }).click();

    await expect(page.getByText(/minimal 8 karakter/i)).toBeVisible({ timeout: 5_000 });
  });
});
