"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import {
  FileText,
  Plus,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Newspaper,
  GraduationCap,
  Loader2,
  AlertCircle,
  Megaphone,
  MessageSquare,
} from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: "DRAFT" | "PUBLISHED";
  articleType: "STOCK_ANALYSIS" | "EDUCATIONAL" | "NEWS" | "GENERAL";
  aiProvider: string | null;
  tickerTag: string | null;
  tags: string[];
  createdAt: string;
  publishedAt: string | null;
  author: { id: string; name: string | null; username: string | null; image: string | null };
}

export default function ArticlesAdminPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "DRAFT" | "PUBLISHED">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "STOCK_ANALYSIS" | "EDUCATIONAL" | "NEWS" | "GENERAL">("all");

  const { data: statsData } = useQuery<{ data: { total: number; published: number; drafts: number; stockAnalysis: number; educational: number } }>({
    queryKey: ["admin-article-stats"],
    queryFn: () => fetch("/api/admin/articles/stats").then((r) => r.json()),
  });

  const { data: articlesData, isLoading } = useQuery<{ data: Article[] }>({
    queryKey: ["admin-articles", statusFilter, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      return fetch(`/api/admin/articles?${params}`).then((r) => r.json());
    },
  });

  const publishMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/articles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish" }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const unpublishMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/articles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish" }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/articles/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const stats = statsData?.data;
  const articles = articlesData?.data ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Article Management" description="Manage AI-generated articles for SEO content" icon={FileText} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminKpiCard title="Total Articles" icon={FileText} value={stats?.total ?? 0} gradient="blue" />
        <AdminKpiCard title="Published" icon={CheckCircle2} value={stats?.published ?? 0} gradient="emerald" />
        <AdminKpiCard title="Drafts" icon={Clock} value={stats?.drafts ?? 0} gradient="amber" />
        <AdminKpiCard title="Stock Analysis" icon={Newspaper} value={stats?.stockAnalysis ?? 0} gradient="blue" />
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/articles/generate">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 transition-all">
            <Plus className="h-4 w-4" />
            Generate New Article
          </Button>
        </Link>

        <div className="flex gap-1 ml-auto">
          {(["all", "DRAFT", "PUBLISHED"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s === "DRAFT" ? "Drafts" : "Published"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "STOCK_ANALYSIS", "NEWS", "GENERAL", "EDUCATIONAL"] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t === "all" ? "All Types" : t === "STOCK_ANALYSIS" ? "Stock" : t === "NEWS" ? "News" : t === "GENERAL" ? "General" : "Edu"}
            </Button>
          ))}
        </div>
      </div>

      {/* Article list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No articles found.</p>
            <Link href="/admin/articles/generate">
              <Button variant="outline" size="sm" className="mt-3">
                Generate your first article
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} className="group border-gray-200/80 shadow-md shadow-gray-200/30 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={article.status === "PUBLISHED" ? "default" : "secondary"}
                        className={
                          article.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-700 text-[10px] font-bold"
                            : "bg-amber-100 text-amber-700 text-[10px] font-bold"
                        }
                      >
                        {article.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {article.articleType === "STOCK_ANALYSIS" ? (
                          <><Newspaper className="h-3 w-3 mr-1" />Stock Analysis</>
                        ) : article.articleType === "NEWS" ? (
                          <><Megaphone className="h-3 w-3 mr-1" />News</>
                        ) : article.articleType === "GENERAL" ? (
                          <><MessageSquare className="h-3 w-3 mr-1" />General</>
                        ) : (
                          <><GraduationCap className="h-3 w-3 mr-1" />Educational</>
                        )}
                      </Badge>
                      {article.aiProvider && (
                        <span className="text-[10px] text-gray-400">via {article.aiProvider}</span>
                      )}
                      {article.tickerTag && (
                        <Badge variant="outline" className="text-[10px] font-mono">{article.tickerTag}</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 truncate">{article.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{article.excerpt}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                      <span>{new Date(article.createdAt).toLocaleDateString("id-ID")}</span>
                      {article.tags.length > 0 && (
                        <span className="flex gap-1">
                          {article.tags.slice(0, 3).map((t) => (
                            <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/admin/articles/${article.id}/preview`}>
                      <Button size="sm" variant="outline" className="gap-1 text-xs">
                        <Eye className="h-3 w-3" />
                        Preview
                      </Button>
                    </Link>
                    {article.status === "DRAFT" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => publishMut.mutate(article.id)}
                        disabled={publishMut.isPending}
                      >
                        <Eye className="h-3 w-3" />
                        Publish
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => unpublishMut.mutate(article.id)}
                        disabled={unpublishMut.isPending}
                      >
                        Unpublish
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Delete this article?")) deleteMut.mutate(article.id);
                      }}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
