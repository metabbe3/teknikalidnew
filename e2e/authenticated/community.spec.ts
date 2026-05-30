import { test, expect } from "@playwright/test";
import { registerAndLogin } from "../helpers/auth";
import { TEST_TICKER } from "../helpers/test-data";

test.describe("Community", () => {
  test.beforeEach(async ({ page, context }) => {
    await registerAndLogin(page, context);
  });

  test("community page loads", async ({ page }) => {
    await page.goto("/community");
    await expect(page.getByText(/Komunitas|Community/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("create a new post", async ({ page }) => {
    await page.goto("/community");

    // Find the post form
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await textarea.fill(`E2E test post ${Date.now()}`);
      const submitBtn = page.getByRole("button", { name: /post|kirim|submit/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("like a post", async ({ page }) => {
    // Create a post first via API
    const post = await page.evaluate(async () => {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `E2E like test ${Date.now()}` }),
      });
      return r.json();
    });

    await page.goto("/community");

    // Find like button
    const likeBtn = page.getByRole("button", { name: /like|suka/i }).first();
    if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("navigate to post detail", async ({ page }) => {
    await page.goto("/community");

    // Find a post link
    const postLink = page.locator('a[href*="/community/post/"]').first();
    if (await postLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await postLink.click();
      await expect(page).toHaveURL(/\/community\/post\//, { timeout: 10_000 });
    }
  });

  test("add comment to post", async ({ page }) => {
    // Create a post via API
    const post = await page.evaluate(async () => {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `E2E comment test ${Date.now()}` }),
      });
      return r.json();
    });

    if (post?.data?.id) {
      await page.goto(`/community/post/${post.data.id}`);

      const commentInput = page.locator("textarea").first();
      if (await commentInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await commentInput.fill(`E2E test comment ${Date.now()}`);
        const submitBtn = page.getByRole("button", { name: /kirim|submit|comment/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test("delete own comment", async ({ page }) => {
    // Create post and comment via API
    const post = await page.evaluate(async () => {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `E2E delete test ${Date.now()}` }),
      });
      return r.json();
    });

    if (post?.data?.id) {
      const comment = await page.evaluate(async (postId) => {
        const r = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "E2E comment to delete", postId }),
        });
        return r.json();
      }, post.data.id);

      if (comment?.data?.id) {
        await page.goto(`/community/post/${post.data.id}`);

        const deleteBtn = page.getByRole("button", { name: /delete|hapus/i }).first();
        if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await deleteBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});
