import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const COMFYUI_OUTPUT_DIR =
  process.env.COMFYUI_OUTPUT_DIR ||
  path.resolve(process.cwd(), "comfyui-cache");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Prevent directory traversal
    const safeName = path.basename(filename);
    if (safeName !== filename) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(COMFYUI_OUTPUT_DIR, safeName);
    const fileBuffer = await fs.readFile(filePath);

    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
