"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email atau password salah. Periksa kembali atau daftar akun baru.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      <div className="grid lg:grid-cols-2 gap-8 items-stretch">
        {/* Brand panel (desktop) */}
        <div className="hidden lg:block">
          <AuthBrandPanel />
        </div>

        {/* Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="lg:hidden">
              <Link href="/" className="font-serif text-xl font-semibold text-text-primary">TeknikalID</Link>
              <p className="text-sm text-text-secondary">Analisa teknikal saham IDX</p>
            </div>

            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Masuk ke akun Anda</h1>
              <p className="text-text-secondary text-sm mt-1.5">
                Belum punya akun?{" "}
                <Link href="/auth/register" className="text-accent font-medium hover:underline">Daftar gratis</Link>
              </p>
            </div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium hover:bg-bg-hover hover:border-accent/30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Masuk dengan Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-tertiary">atau dengan email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-text-primary">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-bg-card border border-border rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-colors"
                  placeholder="nama@email.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-text-primary">Password</label>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-bg-card border border-border rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-colors"
                  placeholder="Masukkan password"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-bearish bg-bearish/5 border border-bearish/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-accent/90 transition-colors press-scale disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Memproses…" : "Masuk"}
              </button>
            </form>

            <p className="text-center text-xs text-text-tertiary">
              Dengan masuk, Anda menyetujui ketentuan layanan TeknikalID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
