"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";

interface PendingArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  articleType: string;
  tickerTag: string | null;
  updatedAt: string;
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
  const { data, isLoading } = useQuery<{ data: PendingArticle[] }>({
    queryKey: ["admin-review-pending"],
    queryFn: async () => {
      const r = await fetch("/api/admin/articles/review");
      if (!r.ok) throw new Error("Gagal memuat");
      return r.json();
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch("/api/admin/articles/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error("Gagal menyetujui");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-review-pending"] }),
  });

  const articles = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Antrian Tinjauan Editor"
        description="Artikel hasil sistem yang belum ditinjau editor. Setujui untuk memunculkan label E-E-A-T 'Ditinjau oleh [editor]'."
      />

      <p className="text-sm text-text-tertiary font-mono">{articles.length} artikel menunggu tinjauan</p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-text-tertiary">Tidak ada artikel menunggu tinjauan. 🎉</p>
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
                <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(a.id)}>
                  {approve.isPending && approve.variables === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Setujui
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
