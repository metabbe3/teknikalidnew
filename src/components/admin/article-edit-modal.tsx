"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditableArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  tickerTag: string | null;
  isListed: boolean;
}

export function ArticleEditModal({ article, open, onClose }: { article: EditableArticle; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [tags, setTags] = useState(article.tags.join(", "));
  const [tickerTag, setTickerTag] = useState(article.tickerTag ?? "");
  const [isListed, setIsListed] = useState(article.isListed);

  // Re-sync form each time the modal opens (possibly for a different article)
  useEffect(() => {
    if (open) {
      setTitle(article.title);
      setExcerpt(article.excerpt);
      setTags(article.tags.join(", "));
      setTickerTag(article.tickerTag ?? "");
      setIsListed(article.isListed);
    }
  }, [open, article]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          tickerTag: tickerTag || null,
          isListed,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error ?? "Gagal menyimpan artikel");
      return json;
    },
    onSuccess: () => {
      toast.success("Artikel tersimpan");
      onClose();
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["admin-article-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-bold text-base text-gray-900">Edit Artikel</h2>
          <p className="text-xs text-gray-400 font-mono truncate">{article.slug}</p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Judul</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Ringkasan (excerpt)</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={500}
              rows={3}
              className="flex w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Tags (pisah koma)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="mis. perbankan, BBCA, analisa teknikal" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Ticker</label>
            <Input value={tickerTag} onChange={(e) => setTickerTag(e.target.value)} maxLength={20} placeholder="mis. BBCA (kosongkan utk brief pasar)" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isListed} onChange={(e) => setIsListed(e.target.checked)} className="h-4 w-4" />
            Tampil di listing publik
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saveMut.isPending}>
              Batal
            </Button>
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
