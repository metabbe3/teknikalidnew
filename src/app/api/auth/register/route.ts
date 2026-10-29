import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  anonId: z.string().min(8).max(36).regex(/^[a-f0-9-]+$/i).optional(), // tracking-audit G8
}).refine((d) => d.password === d.confirmPassword, { message: "Password tidak cocok" });

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    await authService.register(body.email, body.password, body.confirmPassword);

    // tracking-audit G8: daftar_berhasil SERVER-SIDE (bukan klik tombol) + identity stitching
    // initialAnonId → histori retensi anonim pra-daftar menyatu ke akun (tak terpecah 2 identitas).
    try {
      const u = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
      if (u && body.anonId) {
        await prisma.user.update({ where: { id: u.id }, data: { initialAnonId: body.anonId } }).catch(() => {});
        await prisma.engagementEvent.create({
          data: { anonId: body.anonId, path: "/auth/register", type: "cta_click", label: "daftar_berhasil" },
        }).catch(() => {});
      }
    } catch { /* telemetry tidak boleh gagalkan register */ }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "register");
  }
}
