import { redirect } from "next/navigation";

export default function CronConfigPage() {
  redirect("/admin/pipelines");
}
