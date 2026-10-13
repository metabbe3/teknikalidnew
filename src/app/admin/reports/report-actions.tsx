"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ReportActionsProps {
  reportId: string;
  targetType: string;
  targetId: string;
}

export function ReportActions({ reportId, targetType, targetId }: ReportActionsProps) {
  const router = useRouter();

  const action = useMutation({
    mutationFn: async (action: "delete" | "dismiss" | "ban") => {
      const r = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error("Gagal memproses laporan");
    },
    onSuccess: () => {
      toast.success("Laporan diproses");
      router.refresh();
    },
    onError: () => {
      toast.error("Gagal memproses laporan");
    },
  });

  return (
    <div className="flex items-center gap-2 pt-1 border-t border-border">
      <button
        data-action="delete"
        data-target-type={targetType}
        data-target-id={targetId}
        disabled={action.isPending}
        onClick={() => action.mutate("delete")}
        className="text-xs font-medium text-bearish hover:text-bearish/80 bg-bearish/5 px-3 py-1.5 rounded-full transition-colors press-scale disabled:opacity-50"
      >
        Hapus Konten
      </button>
      <button
        data-action="dismiss"
        disabled={action.isPending}
        onClick={() => action.mutate("dismiss")}
        className="text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-hover px-3 py-1.5 rounded-full transition-colors press-scale disabled:opacity-50"
      >
        Abaikan
      </button>
      <button
        data-action="ban"
        data-target-type={targetType}
        data-target-id={targetId}
        disabled={action.isPending}
        onClick={() => action.mutate("ban")}
        className="text-xs font-medium text-white bg-text-primary hover:opacity-90 px-3 py-1.5 rounded-full transition-opacity press-scale disabled:opacity-50"
      >
        Ban User
      </button>
    </div>
  );
}
