import { redirect } from "next/navigation";

/**
 * Short links teknikal.id — /s/<code> → 302 target + UTM otomatis.
 * Owner mandate 27 Okt 2026: link sosmed pendek + attribution per-post.
 * SATU SUMBER: src/lib/short-links.ts (JANGAN hardcode map di file lain).
 */
import { resolveShortLink } from "@/lib/short-links";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const target = resolveShortLink(code);
  redirect(target);
}
