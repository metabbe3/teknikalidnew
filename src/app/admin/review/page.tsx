"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CheckCircle2, Loader2, ExternalLink, XCircle, History } from "lucide-react";

interface PendingArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  articleType: string;
  tickerTag: string | null;
  updatedAt: string;
}

interface ReviewStats {
  pending: number;
  approved30d: number;
  rejected30d: number;
}

interface ReviewHistoryItem {
  at: string;
  editor: string;
  action: "approve" | "reject" | string;
  note: string | null;
  articleId: string | null;
}

interface ReviewResponse {
  data: PendingArticle[];
  stats: ReviewStats;
  history: ReviewHistoryItem[];
}

const TYPE_LABEL: Record<string, string> = {
  DAILY_SNAPSHOT: "Snapshot",
  MOVEMENT_ANALYSIS: "Kenapa Naik",
  STOCK_ANALYSIS: "Analisa",
  NEWS: "Berita",
  EDUCATIONAL: "Edukasi",
  GENERAL: "Umum",
};

export default function ReviewQueuePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ReviewResponse>({
    queryKey: ["admin-review-pending"],
    queryFn: async () => {
      const r = await fetch("/api/admin/articles/review");
      if (!r.ok) throw new Error("Gagal memuat");
      return r.json();
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-review-pending"] });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; action: "approve" | "reject" }) => {
      let note: string | undefined;
      if (vars.action === "reject") {
        note = window.prompt("Alasan penolakan (opsional, tercatat di riwayat):") ?? "";
      }
      const r = await fetch("/api/admin/articles/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vars.id, action: vars.action, note }),
      });
      if (!r.ok) throw new Error("Gagal menyimpan keputusan");
    },
    onSuccess: invalidate,
  });

  const articles = data?.data ?? [];
  const stats = data?.stats;
  const history = data?.history ?? [];

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Antrian Tinjauan Editor"
        description="Artikel hasil sistem yang belum ditinjau editor. Setujui untuk label E-E-A-T 'Ditinjau oleh [editor]', atau tolak untuk menurunkannya ke DRAFT agar diedit ulang."
      />

      {/* KPI header — satu sumber kebenaran: AuditLog 30 hari */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-card rounded-xl depth-shadow p-4">
          <p className="text-xs text-text-tertiary">Menunggu tinjauan</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{stats ? stats.pending : "—"}</p>
        </div>
        <div className="bg-bg-card rounded-xl depth-shadow p-4">
          <p className="text-xs text-text-tertiary">Disetujui 30 hari</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{stats ? stats.approved30d : "—"}</p>
        </div>
        <div className="bg-bg-card rounded-xl depth-shadow p-4">
          <p className="text-xs text-text-tertiary">Ditolak 30 hari</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats ? stats.rejected30d : "—"}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-text-tertiary">Tidak ada artikel menunggu tinjauan.</p>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="flex items-start gap-3 bg-bg-card rounded-xl depth-shadow p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[a.articleType] ?? a.articleType}</Badge>
                  {a.tickerTag && <span className="text-xs font-mono text-blue-500">{a.tickerTag.replace(".JK", "")}</span>}
                </div>
                <p className="text-sm font-semibold text-text-primary line-clamp-1">{a.title}</p>
                <p className="text-xs text-text-tertiary line-clamp-1 mt-0.5">{a.excerpt}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/berita/${a.slug}`} target="_blank">
                  <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-400"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: a.id, action: "reject" })}
                >
                  {decide.isPending && decide.variables?.action === "reject" && decide.variables?.id === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Tolak
                </Button>
                <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: a.id, action: "approve" })}>
                  {decide.isPending && decide.variables?.action === "approve" && decide.variables?.id === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Setujui
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Riwayat keputusan — 50 terakhir dari AuditLog */}
      <div className="bg-bg-card rounded-xl depth-shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-text-tertiary" />
          <h2 className="text-sm font-semibold text-text-primary">Riwayat keputusan</h2>
          <span className="text-xs text-text-tertiary">{history.length} terakhir</span>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-text-tertiary">Belum ada keputusan tercatat.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                <Badge variant={h.action === "reject" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                  {h.action === "reject" ? "Ditolak" : "Disetujui"}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary">
                    {h.editor} · {new Date(h.at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  {h.note && <p className="text-xs text-text-tertiary mt-0.5">"{h.note}"</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
