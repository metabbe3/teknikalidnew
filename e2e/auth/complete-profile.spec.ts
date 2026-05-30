import { test, expect } from "@playwright/test";
import { uniqueEmail, uniqueUsername } from "../helpers/test-data";

async function registerAndGoToProfile(page: import("@playwright/test").Page) {
  const email = uniqueEmail();
  await page.goto("/auth/register");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill("testpassword123");
  await page.locator("#confirmPassword").fill("testpassword123");
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page).toHaveURL(/\/auth\/complete-profile/, { timeout: 15_000 });
  return email;
}

test.describe("Complete Profile", () => {
  test("complete-profile page loads after registration", async ({ page }) => {
    await registerAndGoToProfile(page);
    await expect(page.getByRole("heading", { name: /Lengkapi Profil/i })).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
  });

  test("can set a valid username", async ({ page }) => {
    await registerAndGoToProfile(page);
    await page.getByLabel("Username").fill(uniqueUsername());
    await page.getByRole("button", { name: /Simpan/i }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });
  });

  test("invalid username shows error (too short)", async ({ page }) => {
    await registerAndGoToProfile(page);
    await page.getByLabel("Username").fill("ab");
    await page.getByRole("button", { name: /Simpan/i }).click();
    await expect(page.getByText(/3.*20.*karakter/i)).toBeVisible({ timeout: 5_000 });
  });

  test("name field is optional", async ({ page }) => {
    await registerAndGoToProfile(page);
    await page.getByLabel("Username").fill(uniqueUsername());
    await page.getByRole("button", { name: /Simpan/i }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });
  });
});
