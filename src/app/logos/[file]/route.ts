// ops-2026-11-04-02 (residual kill-switch, 16 Nov): manifest fix eb2e0c9 sudah live,
// tapi client dengan chunk/HTML stale masih meminta /logos/<TICKER>.jpg yang filenya
// sudah tidak ada (83× "internal image response failed" /24h pasca-deploy; semua 78
// ticker punya png/svg di mirror). File statis public/logos SELALU menang atas route
// ini di Next — handler hanya terpanggil saat file 404, lalu melayani ext tersedia
// pertama (chain sama dengan StockLogo) → 0 error optimizer, stale client ikut sembuh.
import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
};
// Chain sama dengan StockLogo onError: png → jpg → svg (+webp mirror).
const EXT_CHAIN = ["png", "jpg", "svg", "webp"] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  // SEC-REVIEW (input path): basename ketat — tolak traversal/URL-encode sisipan.
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(file) || file.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const dot = file.lastIndexOf(".");
  if (dot <= 0) return new NextResponse("Not found", { status: 404 });
  const base = file.slice(0, dot);
  for (const ext of EXT_CHAIN) {
    try {
      const buf = await readFile(
        path.join(process.cwd(), "public", "logos", `${base}.${ext}`)
      );
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": MIME[ext] ?? "application/octet-stream",
          // Logo stabil; 1 hari cukup agar koreksi mirror cepat menyebar.
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      /* coba ext berikutnya */
    }
  }
  return new NextResponse("Not found", { status: 404 });
}
