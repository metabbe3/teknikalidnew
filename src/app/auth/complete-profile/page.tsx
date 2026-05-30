"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CompleteProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState(session?.user?.name || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username harus 3-20 karakter (huruf, angka, underscore)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat profil");
        setLoading(false);
        return;
      }

      await update();
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-bg-card depth-shadow rounded-xl p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Lengkapi Profil</h1>
          <p className="text-text-secondary text-sm mt-1">Pilih username untuk akun kamu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1.5">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              maxLength={20}
              className="w-full bg-bg-hover border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="trader_jakarta"
            />
            <p className="text-[10px] text-text-secondary mt-1">3-20 karakter, huruf, angka, underscore</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">Nama (opsional)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-hover border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Nama tampilan"
            />
          </div>

          {error && <p className="text-sm text-bearish">{error}</p>}

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full bg-text-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity press-scale disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>
      </div>
    </div>
  );
}
