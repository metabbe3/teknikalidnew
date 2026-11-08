import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import GoogleSignInButton from "@/components/auth/google-signin-button";

const MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau password salah. Periksa kembali atau daftar akun baru.",
  AccessDenied: "Akses ditolak. Hubungi kami jika menurut Anda ini keliruan.",
  Verification: "Tautan verifikasi sudah kedaluwarsa. Silakan minta yang baru.",
  RateLimit: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  OAuthCallbackError: "Sesi Google terputus (biasanya cookie diblokir browser). Coba lagi dengan Google di bawah ini.",
  OAuthAccountNotLinked: "Email ini sudah dipakai akun dengan metode masuk lain. Masuk dengan cara yang sama seperti saat mendaftar.",
  Default: "Terjadi kesalahan saat masuk. Coba lagi — kalau berlanjut, hubungi kami.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Owner 8 Nov: auth error berulang 2 user loyal tapi kita buta penyebab — log type ke server
  // agar bisa didiagnosis (CredentialsSignin vs OAuth callback vs lainnya). No PII selain type.
  console.warn(`[auth-error] type=${error ?? "Default"}`);
  const message = MESSAGES[error ?? "Default"] ?? MESSAGES.Default;
  const isOAuthIssue = error === "OAuthCallbackError" || error === "OAuthSignin" ||
    error === "OAuthAccountNotLinked" || error === "StateStore" || error === "CallbackRouteError";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-xl border border-border bg-bg-card p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <h1 className="font-serif text-xl font-semibold text-text-primary">Gagal Masuk</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{message}</p>
        {isOAuthIssue && (
          <div className="mt-6">
            <GoogleSignInButton label="Coba lagi dengan Google" className="mb-2" />
            <p className="text-xs text-text-tertiary">
              Kalau tetap gagal, coba izinkan cookie situs ini di pengaturan browser, lalu buka
              halaman ini lagi.
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signin"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Coba masuk lagi
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
          >
            Daftar akun gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
