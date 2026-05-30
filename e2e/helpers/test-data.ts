export const TEST_USER = {
  email: `e2e-${Date.now()}@test.com`,
  password: "testpassword123",
  username: `e2e_user_${Date.now()}`,
  name: "E2E Test User",
};

export const TEST_ADMIN = {
  email: `e2e-admin-${Date.now()}@test.com`,
  password: "adminpassword123",
  username: `e2e_admin_${Date.now()}`,
  name: "E2E Admin",
};

export const TEST_TICKER = "BBCA.JK";
export const TEST_TICKER_ALT = "BBRI.JK";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`;
}

export function uniqueUsername(prefix = "e2e") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
