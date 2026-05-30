import { type Page, type BrowserContext } from "@playwright/test";
import { uniqueEmail, uniqueUsername } from "./test-data";

interface TestUser {
  email: string;
  password: string;
  username: string;
}

export async function registerViaApi(
  request: { post: (url: string, options?: { data?: unknown }) => Promise<{ status: number; ok: boolean }> },
  overrides?: Partial<TestUser>,
): Promise<TestUser> {
  const user: TestUser = {
    email: overrides?.email ?? uniqueEmail(),
    password: overrides?.password ?? "testpassword123",
    username: overrides?.username ?? uniqueUsername(),
  };

  const res = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    },
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status}`);
  }

  return user;
}

export async function loginViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Get CSRF token
  const { csrfToken } = await page.evaluate(async () => {
    const r = await fetch("/api/auth/csrf");
    return r.json();
  });

  // Login via credentials callback
  await page.evaluate(async ({ email, password, csrfToken }) => {
    await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        callbackUrl: "/",
        json: "true",
      }),
    });
  }, { email, password, csrfToken });
}

export async function loginViaPage(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/\//, { timeout: 10_000 });
}

export async function registerAndLogin(
  page: Page,
  context: BrowserContext,
  overrides?: Partial<TestUser>,
): Promise<TestUser> {
  const user: TestUser = {
    email: overrides?.email ?? uniqueEmail(),
    password: overrides?.password ?? "testpassword123",
    username: overrides?.username ?? uniqueUsername(),
  };

  // Navigate to a page first so relative URLs work
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Register via API
  const regOk = await page.evaluate(async ({ email, password }) => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword: password }),
    });
    return r.ok;
  }, { email: user.email, password: user.password });

  if (!regOk) throw new Error("Registration failed");

  // Login via API to properly set session cookie
  await loginViaApi(page, user.email, user.password);

  // Complete profile if needed
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/auth/complete-profile")) {
    await page.getByLabel("Username").fill(user.username);
    await page.getByRole("button", { name: "Simpan Profil" }).click();
    await page.waitForURL(/\//, { timeout: 10_000 });
  }

  return user;
}
