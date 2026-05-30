import { test, expect } from "@playwright/test";
import { uniqueEmail } from "../helpers/test-data";

test.describe("Sign In", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
  });

  test("signin page loads with form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Masuk/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("signin page shows Google OAuth button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });

  test("signin page has link to register", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Daftar/i })).toBeVisible();
  });

  test("login with non-existent email shows error", async ({ page }) => {
    await page.getByLabel("Email").fill("nonexistent@test.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();

    await expect(page.getByText(/salah|gagal/i)).toBeVisible({ timeout: 5_000 });
  });

  test("full auth flow: register → complete profile → sign in", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/auth/register");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("testpassword123");
    await page.locator("#confirmPassword").fill("testpassword123");
    await page.getByRole("button", { name: "Daftar" }).click();

    await expect(page).toHaveURL(/\/auth\/complete-profile/, { timeout: 15_000 });
    const username = `e2e_${Date.now()}`;
    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: /Simpan/i }).click();

    await expect(page).toHaveURL("/", { timeout: 15_000 });
  });
});
