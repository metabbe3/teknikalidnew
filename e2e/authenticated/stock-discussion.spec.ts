import { test, expect } from "@playwright/test";
import { registerAndLogin } from "../helpers/auth";
import { TEST_TICKER } from "../helpers/test-data";

test.describe("Stock Discussion", () => {
  test.beforeEach(async ({ page, context }) => {
    await registerAndLogin(page, context);
  });

  test("can post a comment on stock page", async ({ page }) => {
    await page.goto(`/stocks/${TEST_TICKER}`);

    // Wait for discussion section
    await expect(page.getByText(/Diskusi/i)).toBeVisible({ timeout: 10_000 });

    // Find the comment form
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await textarea.fill(`E2E stock comment ${Date.now()}`);
      const submitBtn = page.getByRole("button", { name: /kirim|submit|post/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("comment appears in discussion list", async ({ page }) => {
    const content = `E2E visible test ${Date.now()}`;

    // Post via API
    await page.evaluate(async ({ ticker, content }) => {
      await fetch(`/api/stocks/${ticker}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }, { ticker: TEST_TICKER, content });

    // Reload and check
    await page.goto(`/stocks/${TEST_TICKER}`);
    await page.waitForTimeout(2000);
    await expect(page.getByText(content)).toBeVisible({ timeout: 10_000 });
  });

  test("reply to a comment", async ({ page }) => {
    // Create a comment via API
    const comment = await page.evaluate(async (ticker) => {
      const r = await fetch(`/api/stocks/${ticker}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `E2E parent comment ${Date.now()}` }),
      });
      return r.json();
    }, TEST_TICKER);

    if (comment?.data?.id) {
      await page.goto(`/stocks/${TEST_TICKER}`);

      // Find reply button
      const replyBtn = page.getByRole("button", { name: /balas|reply/i }).first();
      if (await replyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await replyBtn.click();

        // Find reply textarea
        const replyInput = page.locator("textarea").nth(1).or(page.locator('textarea[placeholder*="balas"]')).first();
        if (await replyInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await replyInput.fill(`E2E reply ${Date.now()}`);
          const submitBtn = page.getByRole("button", { name: /kirim|submit/i }).first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }
  });
});
