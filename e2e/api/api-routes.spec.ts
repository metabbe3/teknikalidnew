import { test, expect } from "@playwright/test";
import { uniqueEmail } from "../helpers/test-data";

test.describe("API Routes", () => {
  test.describe("Health", () => {
    test("GET /api/health returns 200", async ({ request }) => {
      const res = await request.get("/api/health");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body).toHaveProperty("timestamp");
    });
  });

  test.describe("Stocks", () => {
    test("GET /api/stocks returns array", async ({ request }) => {
      const res = await request.get("/api/stocks");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    });

    test("GET /api/stocks?sector=Banking filters by sector", async ({ request }) => {
      const res = await request.get("/api/stocks?sector=Banking");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body)).toBeTruthy();
    });

    test("GET /api/stocks/BBCA.JK returns stock detail", async ({ request }) => {
      const res = await request.get("/api/stocks/BBCA.JK");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.ticker).toBe("BBCA.JK");
      expect(body).toHaveProperty("name");
    });

    test("GET /api/stocks/INVALID returns 404", async ({ request }) => {
      const res = await request.get("/api/stocks/INVALID");
      expect(res.status()).toBe(404);
    });
  });

  test.describe("Market", () => {
    test("GET /api/market returns market data", async ({ request }) => {
      const res = await request.get("/api/market");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toBeDefined();
    });
  });

  test.describe("Stock Comments", () => {
    test("GET /api/stocks/BBCA.JK/comments returns paginated data", async ({ request }) => {
      const res = await request.get("/api/stocks/BBCA.JK/comments");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("nextCursor");
      expect(Array.isArray(body.data)).toBeTruthy();
    });
  });

  test.describe("Registration", () => {
    test("POST /api/auth/register with valid data returns 201", async ({ request }) => {
      const email = uniqueEmail();
      const res = await request.post("/api/auth/register", {
        data: {
          email,
          password: "testpassword123",
          confirmPassword: "testpassword123",
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("POST /api/auth/register with duplicate email returns 409", async ({ request }) => {
      const email = uniqueEmail();
      // First registration
      await request.post("/api/auth/register", {
        data: {
          email,
          password: "testpassword123",
          confirmPassword: "testpassword123",
        },
      });
      // Duplicate
      const res = await request.post("/api/auth/register", {
        data: {
          email,
          password: "testpassword123",
          confirmPassword: "testpassword123",
        },
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.error).toContain("sudah terdaftar");
    });

    test("POST /api/auth/register with invalid email returns 400", async ({ request }) => {
      const res = await request.post("/api/auth/register", {
        data: {
          email: "not-an-email",
          password: "testpassword123",
          confirmPassword: "testpassword123",
        },
      });
      expect(res.status()).toBe(400);
    });

    test("POST /api/auth/register with short password returns 400", async ({ request }) => {
      const res = await request.post("/api/auth/register", {
        data: {
          email: uniqueEmail(),
          password: "short",
          confirmPassword: "short",
        },
      });
      expect(res.status()).toBe(400);
    });

    test("POST /api/auth/register with mismatched passwords returns 400", async ({ request }) => {
      const res = await request.post("/api/auth/register", {
        data: {
          email: uniqueEmail(),
          password: "testpassword123",
          confirmPassword: "differentpassword",
        },
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe("Username Check", () => {
    test("GET /api/profile/check-username returns availability", async ({ request }) => {
      const res = await request.get(`/api/profile/check-username?username=${Date.now()}_test`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toHaveProperty("available");
    });

    test("GET /api/profile/check-username without param returns 400", async ({ request }) => {
      const res = await request.get("/api/profile/check-username");
      expect(res.status()).toBe(400);
    });
  });

  test.describe("Protected Routes", () => {
    test("GET /api/watchlist returns 401 when not authenticated", async ({ request }) => {
      const res = await request.get("/api/watchlist");
      expect(res.status()).toBe(401);
    });

    test("POST /api/watchlist returns 401 when not authenticated", async ({ request }) => {
      const res = await request.post("/api/watchlist", {
        data: { ticker: "BBCA.JK" },
      });
      expect(res.status()).toBe(401);
    });

    test("POST /api/posts returns 401 when not authenticated", async ({ request }) => {
      const res = await request.post("/api/posts", {
        data: { content: "test post" },
      });
      expect(res.status()).toBe(401);
    });

    test("POST /api/comments returns 401 when not authenticated", async ({ request }) => {
      const res = await request.post("/api/comments", {
        data: { content: "test comment" },
      });
      expect(res.status()).toBe(401);
    });

    test("PATCH /api/profile returns 401 when not authenticated", async ({ request }) => {
      const res = await request.patch("/api/profile", {
        data: { name: "test" },
      });
      expect(res.status()).toBe(401);
    });

    test("GET /api/admin/reports returns 401 when not authenticated", async ({ request }) => {
      const res = await request.get("/api/admin/reports");
      expect(res.status()).toBe(401);
    });
  });

  test.describe("Profile (Public)", () => {
    test("GET /api/profile/[unknown] returns 404", async ({ request }) => {
      const res = await request.get("/api/profile/nonexistent_user_12345");
      expect(res.status()).toBe(404);
    });
  });
});
