"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Severity = "info" | "warning" | "critical";

const SEVERITIES: Severity[] = ["info", "warning", "critical"];

// Border kiri preview meniru banner P0 di layout.
const SEVERITY_BORDER: Record<Severity, string> = {
  info: "border-accent",
  warning: "border-amber-500",
  critical: "border-bearish",
};

export function AnnouncementsView() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<Severity>("info");
  const [withBanner, setWithBanner] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ recipients: number; at: string } | null>(null);

  const canSend = title.trim() !== "" && body.trim() !== "" && !sending;

  function pickSeverity(s: Severity) {
    setSeverity(s);
    // Critical otomatis pakai banner; severity lain tidak memaksa.
    if (s === "critical") setWithBanner(true);
  }

  async function submit() {
    const ok = window.confirm(
      "Broadcast ke semua user aktif (non-banned)? Tindakan ini tidak bisa dibatalkan."
    );
    if (!ok) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, severity, withBanner }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal mengirim broadcast");
        return;
      }
      const recipients: number = json.recipients ?? 0;
      toast.success(`Terkirim ke ${recipients} user`);
      setLastResult({
        recipients,
        at: new Date().toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      setTitle("");
      setBody("");
      setSeverity("info");
      setWithBanner(false);
    } catch {
      toast.error("Gagal mengirim broadcast");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded border border-border p-3 text-xs text-text-secondary">
        Bell notification semua user aktif. Banner atas situs muncul sampai dibaca
        user (dismiss per user).
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Broadcast Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="broadcast-title" className="text-xs font-medium text-text-secondary">
                Judul
              </label>
              <input
                id="broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                className="w-full rounded border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="cth: Insiden down 16:50 WIB"
              />
              <p className="text-right text-xs text-text-secondary">{title.length}/120</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="broadcast-body" className="text-xs font-medium text-text-secondary">
                Isi
              </label>
              <textarea
                id="broadcast-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                required
                rows={4}
                className="w-full rounded border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="Pesan yang tampil di bell (dan banner bila diaktifkan)"
              />
              <p className="text-right text-xs text-text-secondary">{body.length}/500</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-text-secondary">Severity</span>
              <div className="flex gap-2">
                {SEVERITIES.map((s) => (
                  <label
                    key={s}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                      severity === s
                        ? "border-border bg-bg-hover text-text-primary"
                        : "border-border text-text-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      className="sr-only"
                      checked={severity === s}
                      onChange={() => pickSeverity(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={withBanner}
                onChange={(e) => setWithBanner(e.target.checked)}
                className="h-4 w-4"
              />
              Tampil juga banner atas situs
            </label>

            <Button onClick={submit} disabled={!canSend}>
              {sending ? "Mengirim…" : "Kirim Broadcast"}
            </Button>

            {lastResult && (
              <p className="text-xs text-text-secondary">
                Terakhir terkirim ke {lastResult.recipients} user — {lastResult.at} WIB
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded border border-border border-l-4 bg-bg-card p-4 ${SEVERITY_BORDER[severity]}`}
            >
              <p className="text-sm font-semibold text-text-primary">
                {title || "Judul broadcast"}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {body || "Isi broadcast tampil di sini."}
              </p>
            </div>
            {withBanner && (
              <p className="mt-2 text-xs text-text-secondary">
                + tampil sebagai banner atas situs sampai dibaca user
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
