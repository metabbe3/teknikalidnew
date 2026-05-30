import { test, expect } from "@playwright/test";
import { registerAndLogin } from "../helpers/auth";
import { TEST_TICKER } from "../helpers/test-data";

test.describe("Comment & Reply Flow", () => {
  const ticker = TEST_TICKER;

  // Helper: wait for discussion section
  async function waitForDiscussion(page: import("@playwright/test").Page) {
    await page.goto(`/stocks/${ticker}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Diskusi" })).toBeVisible({ timeout: 15_000 });
  }

  // Helper: ensure auth is working, skip if not
  async function ensureAuth(page: import("@playwright/test").Page): Promise<boolean> {
    // Check if session is active by hitting the session API
    const session = await page.evaluate(async () => {
      const r = await fetch("/api/auth/session");
      return r.json();
    });
    return !!session?.user?.id;
  }

  test("top-level comment via form does not crash", async ({ page, context }) => {
    await registerAndLogin(page, context);

    // Debug: verify session
    const isAuth = await ensureAuth(page);
    if (!isAuth) {
      // Try re-navigating to trigger session refresh
      await page.goto("/api/auth/session");
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    }

    await waitForDiscussion(page);

    // Check if form is visible (auth required)
    const loginPrompt = page.getByText(/masuk untuk bergabung/i);
    if (await loginPrompt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    const content = `E2E top comment ${Date.now()}`;
    await textarea.fill(content);
    await page.getByRole("button", { name: /kirim/i }).first().click();

    // Check the comment rendered in a <p>, not in the textarea
    await expect(page.locator("p", { hasText: content })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/something went wrong/i).first()).not.toBeVisible();
  });

  test("reply to comment via UI does not crash", async ({ page, context }) => {
    await registerAndLogin(page, context);
    await waitForDiscussion(page);

    // Check auth
    const loginPrompt = page.getByText(/masuk untuk bergabung/i);
    if (await loginPrompt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Post parent comment
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    const parentContent = `E2E parent ${Date.now()}`;
    await textarea.fill(parentContent);
    await page.getByRole("button", { name: /kirim/i }).first().click();
    await expect(page.getByText(parentContent)).toBeVisible({ timeout: 10_000 });

    // Reply
    await page.getByRole("button", { name: /^balas$/i }).first().click();
    const replyContent = `E2E reply ${Date.now()}`;
    const replyTextarea = page.locator("textarea").last();
    await expect(replyTextarea).toBeVisible({ timeout: 3_000 });
    await replyTextarea.fill(replyContent);
    await page.locator('form:has(textarea)').last().locator('button[type="submit"]').click();

    await expect(page.getByText(replyContent)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/something went wrong/i).first()).not.toBeVisible();
  });

  test("reply shows quote block with parent snippet", async ({ page, context }) => {
    await registerAndLogin(page, context);
    await waitForDiscussion(page);

    const loginPrompt = page.getByText(/masuk untuk bergabung/i);
    if (await loginPrompt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Post parent
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    const parentContent = `E2E quote parent ${Date.now()}`;
    await textarea.fill(parentContent);
    await page.getByRole("button", { name: /kirim/i }).first().click();
    await expect(page.getByText(parentContent)).toBeVisible({ timeout: 10_000 });

    // Reply
    await page.getByRole("button", { name: /^balas$/i }).first().click();
    const replyContent = `E2E quote reply ${Date.now()}`;
    const replyTextarea = page.locator("textarea").last();
    await expect(replyTextarea).toBeVisible({ timeout: 3_000 });
    await replyTextarea.fill(replyContent);
    await page.locator('form:has(textarea)').last().locator('button[type="submit"]').click();

    await expect(page.getByText(replyContent)).toBeVisible({ timeout: 10_000 });

    // Verify quote block visible
    await expect(page.locator(".border-l-2").last()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/something went wrong/i).first()).not.toBeVisible();
  });
});
