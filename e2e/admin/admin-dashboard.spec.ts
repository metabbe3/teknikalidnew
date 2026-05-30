import { test, expect } from "@playwright/test";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "9e1df42e99104d3e529b55d00a5af09c";

test.describe("Admin Auth", () => {
  test("unauthenticated /admin returns 404", async ({ page }) => {
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
  });

  test("unauthenticated /api/admin/status returns 404 JSON", async ({ request }) => {
    const res = await request.get("/api/admin/status");
    expect(res.status()).toBe(404);
  });

  test("wrong secret returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/auth", {
      data: { secret: "wrong" },
    });
    expect(res.status()).toBe(401);
  });

  test("correct secret sets cookie and returns success", async ({ request }) => {
    const res = await request.post("/api/admin/auth", {
      data: { secret: ADMIN_SECRET },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("login page renders and accepts secret", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Enter admin secret").fill(ADMIN_SECRET);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/admin", { timeout: 5_000 });
  });

  test("login page shows error on wrong secret", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Enter admin secret").fill("wrong");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid admin secret")).toBeVisible();
  });
});

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Enter admin secret").fill(ADMIN_SECRET);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/admin", { timeout: 5_000 });
  });

  test("system health overview shows 4 KPI cards", async ({ page }) => {
    await expect(page.getByText("Last EOD Sync")).toBeVisible();
    await expect(page.getByText("Last Intraday Sync")).toBeVisible();
    await expect(page.getByText("Database", { exact: true })).toBeVisible();
    await expect(page.getByText("Yahoo Finance API")).toBeVisible();
  });

  test("recent activity table renders", async ({ page }) => {
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("manual trigger buttons are visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Force EOD Sync/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Force Intraday Sync/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear Queue/ })).toBeVisible();
  });

  test("sidebar navigation links work", async ({ page }) => {
    // Direct links (single-item groups) are visible immediately
    await page.getByRole("link", { name: "System Health Overview" }).click();
    await expect(page).toHaveURL("/admin", { timeout: 5_000 });

    // Expand Analytics group
    await page.getByRole("button", { name: /Analytics/ }).click();
    await page.getByRole("link", { name: "Community Analytics" }).click();
    await expect(page).toHaveURL("/admin/community", { timeout: 5_000 });

    await page.getByRole("link", { name: "Predictions" }).click();
    await expect(page).toHaveURL("/admin/predictions", { timeout: 5_000 });

    // Multi-item groups need to be expanded first
    // Click the "Data Pipelines" group header to expand it
    await page.getByRole("button", { name: /Data Pipelines/ }).click();
    await page.getByRole("link", { name: "EOD Sync Logs" }).click();
    await expect(page).toHaveURL("/admin/eod-logs", { timeout: 5_000 });

    await page.getByRole("link", { name: "Intraday Sync Logs" }).click();
    await expect(page).toHaveURL("/admin/intraday-logs", { timeout: 5_000 });

    await page.getByRole("link", { name: "Queue Monitor" }).click();
    await expect(page).toHaveURL("/admin/queue-monitor", { timeout: 5_000 });

    // Expand Market Data group
    await page.getByRole("button", { name: /Market Data/ }).click();
    await page.getByRole("link", { name: /Ticker Manager/ }).click();
    await expect(page).toHaveURL("/admin/ticker-manager", { timeout: 5_000 });

    await page.getByRole("link", { name: "Indicator Database" }).click();
    await expect(page).toHaveURL("/admin/indicators", { timeout: 5_000 });

    // Expand Settings group
    await page.getByRole("button", { name: /Settings/ }).click();
    await page.getByRole("link", { name: "Cron Configuration" }).click();
    await expect(page).toHaveURL("/admin/cron-config", { timeout: 5_000 });

    await page.getByRole("link", { name: "API Keys" }).click();
    await expect(page).toHaveURL("/admin/api-keys", { timeout: 5_000 });
  });

  test("ticker manager shows IDX40 stocks", async ({ page }) => {
    // Expand Market Data group first
    await page.getByRole("button", { name: /Market Data/ }).click();
    await page.getByRole("link", { name: /Ticker Manager/ }).click();
    await expect(page.getByText("BBCA.JK")).toBeVisible();
    await expect(page.getByText("Bank Central Asia")).toBeVisible();
  });

  test("community analytics page loads", async ({ page }) => {
    await page.getByRole("button", { name: /Analytics/ }).click();
    await page.getByRole("link", { name: "Community Analytics" }).click();
    await expect(page).toHaveURL("/admin/community", { timeout: 5_000 });
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Total Posts")).toBeVisible();
    await expect(page.getByText("Moderation Summary")).toBeVisible();
  });

  test("predictions page loads", async ({ page }) => {
    await page.getByRole("button", { name: /Analytics/ }).click();
    await page.getByRole("link", { name: "Predictions" }).click();
    await expect(page).toHaveURL("/admin/predictions", { timeout: 5_000 });
    await expect(page.getByText("Total Predictions")).toBeVisible();
    await expect(page.getByText("Bull vs Bear Distribution")).toBeVisible();
  });

  test("user analytics page loads", async ({ page }) => {
    await page.getByRole("button", { name: /Analytics/ }).click();
    await page.getByRole("link", { name: "User Analytics" }).click();
    await expect(page).toHaveURL("/admin/user-analytics", { timeout: 5_000 });
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("DAU")).toBeVisible();
  });

  test("stock engagement page loads", async ({ page }) => {
    await page.getByRole("button", { name: /Analytics/ }).click();
    await page.getByRole("link", { name: "Stock Engagement" }).click();
    await expect(page).toHaveURL("/admin/stock-engagement", { timeout: 5_000 });
    await expect(page.getByText("Total Follows")).toBeVisible();
    await expect(page.getByText("Most Followed Stocks")).toBeVisible();
  });

  test("auth health page loads", async ({ page }) => {
    await page.getByRole("button", { name: /Analytics/ }).click();
    await page.getByRole("link", { name: "Auth & Security" }).click();
    await expect(page).toHaveURL("/admin/auth-health", { timeout: 5_000 });
    await expect(page.getByText("Active Sessions")).toBeVisible();
    await expect(page.getByText("Auth Provider Distribution")).toBeVisible();
  });

  test("sign out clears cookie and redirects to login", async ({ page }) => {
    // Sign Out is in a DropdownMenu in the sidebar footer
    await page.getByRole("button", { name: /Admin/ }).click();
    await page.getByRole("menuitem", { name: "Sign Out" }).click();
    await page.waitForURL("/admin/login", { timeout: 5_000 });
    expect(page.url()).toContain("/admin/login");

    // Verify admin is now inaccessible
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
  });
});
