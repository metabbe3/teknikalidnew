import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { notificationService } from "@/domains/notification/notification.service";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await authService.requireAuth();
    const result = await notificationService.getUserNotifications(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch notifications");
  }
}

export async function PUT(request: Request) {
  try {
    const user = await authService.requireAuth();
    const body = await request.json();
    const { markAll, id } = body;

    const result = await notificationService.markRead(user.id, {
      markAll: !!markAll,
      id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "mark notifications");
  }
}
