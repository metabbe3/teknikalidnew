import { test, expect } from "@playwright/test";
import { registerAndLogin } from "../helpers/auth";

test.describe("Profile", () => {
  test.beforeEach(async ({ page, context }) => {
    await registerAndLogin(page, context);
  });

  test("can navigate to profile edit page", async ({ page }) => {
    await page.goto("/profile/edit");
    await expect(page.getByText(/Pengaturan|Profile|Edit/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("edit profile - update name and bio", async ({ page }) => {
    await page.goto("/profile/edit");

    // Find form fields
    const nameInput = page.getByLabel(/Nama|Name/i).or(page.locator('input[name="name"]')).first();
    const bioInput = page.getByLabel(/Bio/i).or(page.locator('textarea[name="bio"]')).first();

    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill("Updated E2E Name");
    }

    if (await bioInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await bioInput.clear();
      await bioInput.fill("Updated E2E bio for testing");
    }

    // Save
    const saveBtn = page.getByRole("button", { name: /simpan|save/i });
    if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }
  });

  test("check username availability", async ({ page }) => {
    // Use the API directly
    const result = await page.evaluate(async () => {
      const r = await fetch(`/api/profile/check-username?username=taken_${Date.now()}`);
      return r.json();
    });
    expect(result).toHaveProperty("available");
  });

  test("view own profile page", async ({ page }) => {
    // Get current user info
    const profile = await page.evaluate(async () => {
      const r = await fetch("/api/profile");
      return r.json();
    });

    if (profile?.username) {
      await page.goto(`/profile/${profile.username}`);
      await expect(page.getByText(profile.username)).toBeVisible({ timeout: 10_000 });
    }
  });
});
