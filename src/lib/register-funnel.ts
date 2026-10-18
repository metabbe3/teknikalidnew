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
