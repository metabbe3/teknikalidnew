import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-guard";
import { AnnouncementsView } from "./announcements-view";

export const metadata: Metadata = { title: "Broadcast — Admin" };

export default async function AnnouncementsPage() {
  await requireAdmin();
  return <AnnouncementsView />;
}
