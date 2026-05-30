"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const SOCIAL_PLATFORMS = [
  { key: "twitter", label: "Twitter / X", placeholder: "x.com/username", icon: "𝕏" },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/username", icon: "IG" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/username", icon: "FB" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username", icon: "LI" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@channel", icon: "YT" },
] as const;

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name || "");
  const [username, setUsername] = useState(session?.user?.username || "");
  const [bio, setBio] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [usernameError, setUsernameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (status === "loading") return null;
  if (!session?.user?.id) {
    router.push("/auth/signin");
    return null;
  }

  if (!loaded) {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.bio) setBio(json.data.bio);
        if (json.data?.name) setName(json.data.name);
        if (json.data?.username) setUsername(json.data.username);
        if (json.data?.socialLinks && typeof json.data.socialLinks === "object") {
          setSocialLinks(json.data.socialLinks);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }

  const bioRemaining = 200 - bio.length;

  async function checkUsername(value: string) {
    if (!value || value === session?.user?.username) {
      setUsernameError("");
      return;
    }
    try {
      const res = await fetch(`/api/profile/check-username?username=${encodeURIComponent(value)}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameError(data.available ? "" : "Username sudah digunakan");
      }
    } catch {}
  }

  function updateSocialLink(key: string, value: string) {
    setSocialLinks((prev) => {
      const next = { ...prev };
      if (value.trim()) {
        next[key] = value.trim();
      } else {
        delete next[key];
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUsernameError("");

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameError("Username harus 3-20 karakter (huruf, angka, underscore)");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, username, socialLinks }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menyimpan profil");
        return;
      }

      const result = await res.json();
      const newUsername = result.data?.username || username;
      router.push(`/profile/${newUsername}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6 fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Pengaturan Profil</h1>
        <p className="text-text-secondary text-sm">Perbarui informasi profil Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-card depth-shadow rounded-xl p-6 space-y-5" style={{ borderTop: "3px solid #0d9488" }}>
        {/* Username */}
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm font-medium">@</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              onBlur={() => checkUsername(username)}
              minLength={3}
              maxLength={20}
              required
              className="w-full bg-bg-hover border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/40"
              placeholder="username_anda"
            />
          </div>
          {usernameError && <p className="text-xs text-bearish">{usernameError}</p>}
          <p className="text-[10px] text-text-tertiary">3-20 karakter, huruf, angka, dan underscore</p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium">
            Nama
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="w-full bg-bg-hover border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/40"
            placeholder="Nama tampilan Anda"
          />
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio
            </label>
            <span className={`text-xs ${bioRemaining < 20 ? "text-bearish" : "text-text-secondary"}`}>
              {bioRemaining} karakter tersisa
            </span>
          </div>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= 200) setBio(e.target.value);
            }}
            rows={3}
            className="w-full bg-bg-hover border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/40 resize-none"
            placeholder="Ceritakan tentang diri Anda..."
          />
        </div>

        {/* Social Links */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Media Sosial</p>
            <p className="text-[10px] text-text-tertiary">Tambahkan link media sosial Anda</p>
          </div>
          <div className="space-y-2.5">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.key} className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-bg-hover border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary shrink-0">
                  {platform.icon}
                </span>
                <input
                  type="url"
                  value={socialLinks[platform.key] || ""}
                  onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                  className="flex-1 bg-bg-hover border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/40"
                  placeholder={platform.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-bearish">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !name.trim() || !username.trim()}
            className="bg-teal-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-teal-700 transition-colors press-scale disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
