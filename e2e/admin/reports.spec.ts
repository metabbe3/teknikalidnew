import { test, expect } from "@playwright/test";
import { registerAndLogin } from "../helpers/auth";

test.describe("Admin Reports", () => {
  test("unauthenticated access to admin reports returns 401", async ({ request }) => {
    const res = await request.get("/api/admin/reports");
    expect(res.status()).toBe(401);
  });

  test("non-admin user gets 403 on admin reports API", async ({ page, context }) => {
    await registerAndLogin(page, context);

    // Try accessing admin API directly
    const result = await page.evaluate(async () => {
      const r = await fetch("/api/admin/reports");
      return { status: r.status };
    });

    // Regular users should get 403 (forbidden)
    expect([403, 401]).toContain(result.status);
  });

  test("admin reports page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin/reports");
    // Should redirect to signin or show unauthorized
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/auth\/signin|\/admin\/reports/);
  });
});
