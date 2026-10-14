import Link from "next/link";

const MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau password salah. Periksa kembali atau daftar akun baru.",
  AccessDenied: "Akses ditolak. Hubungi kami jika menurut Anda ini keliruan.",
  Verification: "Tautan verifikasi sudah kedaluwarsa. Silakan minta yang baru.",
  RateLimit: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  Default: "Terjadi kesalahan saat masuk. Coba lagi — kalau berlanjut, hubungi kami.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = MESSAGES[error ?? "Default"] ?? MESSAGES.Default;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-xl border border-border bg-bg-card p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
          ⚠️
        </div>
        <h1 className="font-serif text-xl font-semibold text-text-primary">Gagal Masuk</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{message}</p>
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
