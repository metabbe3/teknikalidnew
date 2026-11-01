/**
 * Register funnel 2-step helpers (prd-2026-10-18-01 / idea-2026-10-18-1).
 * Pure logic diekstrak dari src/app/auth/register/page.tsx supaya bisa
 * dites node:test tanpa React/DOM — perilaku password identik dengan form lama.
 */

/** Loose email gate utk step-1 (satu field, commit kecil).
 *  Tidak menggantikan validasi server (zod .email() di route) — hanya
 *  men-disable tombol "Lanjut" sampai bentuk masuk akal. */
export function isEmailLoose(v: string): boolean {
  const s = v.trim();
  if (s.length === 0 || s.length > 255) return false;
  if (/\s/.test(s)) return false;
  const at = s.split("@");
  if (at.length !== 2) return false;
  const [local, domain] = at;
  if (local.length === 0) return false;
  return /^[^./]/.test(domain) && /\.[^./]+$/.test(domain);
}

/** Paritas UI lama: longEnough = password.length >= 8. */
export function passwordChecks(password: string, confirmPassword: string): { longEnough: boolean; matches: boolean } {
  const longEnough = password.length >= 8;
  const matches = confirmPassword.length > 0 && password === confirmPassword;
  return { longEnough, matches };
}

/** Tombol submit step-2 aktif = password cukup panjang + konfirmasi cocok. */
export function step2Ready(password: string, confirmPassword: string): boolean {
  const { longEnough, matches } = passwordChecks(password, confirmPassword);
  return longEnough && matches;
}

/**
 * Task 1 — Gate CTA register href builder:
 * Mengarahkan user ke /auth/register dengan query param ?ctx=... jika context diberikan,
 * atau href polos /auth/register jika tanpa context.
 */
export function getGateRegisterHref(context?: string | null): string {
  if (!context || !context.trim()) {
    return "/auth/register";
  }
  return `/auth/register?ctx=${encodeURIComponent(context.trim())}`;
}

export interface RegisterSubmitOptions {
  email: string;
  password: string;
  confirmPassword: string;
  ctx?: string | null;
  anonId?: string;
  fetchFn?: typeof fetch;
  trackFn?: (label: string) => void;
}

export interface RegisterSubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Task 2 — Registrasi submit logic & telemetry jujur:
 * Event register_success hanya terkirim SETELAH createUser sukses (res.ok / server response 201),
 * BUKAN saat tombol submit diklik.
 */
export async function executeRegister({
  email,
  password,
  confirmPassword,
  ctx,
  anonId,
  fetchFn = fetch,
  trackFn,
}: RegisterSubmitOptions): Promise<RegisterSubmitResult> {
  const effectiveAnonId =
    anonId ??
    (() => {
      try {
        return localStorage.getItem("eng_anon") ?? undefined;
      } catch {
        return undefined;
      }
    })();

  const res = await fetchFn("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      confirmPassword,
      anonId: effectiveAnonId,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "Gagal mendaftar. Coba lagi." };
  }

  // telemetry AC4-fix 1 Nov: success = post-server-ok, bukan click
  if (trackFn) {
    trackFn("register_success");
    if (ctx && ctx.trim()) {
      trackFn(`register_success_ctx:${ctx.trim()}`.slice(0, 64));
    }
  }

  return { ok: true };
}
