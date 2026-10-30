/**
 * report-preview.util \u2014 SATU PINTU string preview laporan konten.
 * code-audit-tk-2: dipakai blok PENDING + HISTORY admin reports (dulu dua
 * salinan identik inline). Murni/tanpa prisma supaya bisa di-selftest.
 */
export type ReportLike = { id: string; targetType: string; targetId: string };

export interface PostPreviewRow { id: string; content: string; author: { username: string } }
export interface CommentPreviewRow { id: string; content: string; author: { username: string } }

export function previewText(kind: "Post" | "Komentar", username: string, content: string): string {
  return `${kind} oleh @${username}: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`;
}

export function buildPreviewsFromRows(
  reports: ReportLike[],
  posts: PostPreviewRow[],
  comments: CommentPreviewRow[],
): Map<string, string> {
  const postById = new Map(posts.map((p) => [p.id, p]));
  const commentById = new Map(comments.map((c) => [c.id, c]));
  const out = new Map<string, string>();
  for (const r of reports) {
    if (r.targetType === "POST") {
      const post = postById.get(r.targetId);
      out.set(r.id, post ? previewText("Post", post.author.username, post.content) : "[Post dihapus]");
    } else {
      const comment = commentById.get(r.targetId);
      out.set(r.id, comment ? previewText("Komentar", comment.author.username, comment.content) : "[Komentar dihapus]");
    }
  }
  return out;
}
