"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const accessDenied = searchParams.get("error") === "access_denied";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Clear any stale session first (e.g. old role cached in JWT)
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email,
        password,
        rememberMe: String(rememberMe),
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl" />
      <div className="absolute top-10 right-1/4 w-40 h-40 bg-emerald-200/20 rounded-full blur-2xl" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold admin-gradient-text">TeknikalID</h1>
          <p className="text-sm text-gray-500">Internal Admin Access</p>
        </div>

        {accessDenied && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Your account does not have admin access.</span>
          </div>
        )}

        <Card className="admin-accent-blue shadow-xl shadow-blue-500/5 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-center text-gray-800">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={async () => {
                await signOut({ redirect: false });
                signIn("google", { callbackUrl: "/admin" });
              }}
              className="w-full h-11 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Remember me for 7 days</span>
              </label>
              {error && (
                <p className="text-sm text-rose-500 bg-rose-50 p-2 rounded-md text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-md shadow-blue-500/20 transition-all"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-gray-400">
          Restricted access. Authorized personnel only.
        </p>
      </div>
    </div>
  );
}
