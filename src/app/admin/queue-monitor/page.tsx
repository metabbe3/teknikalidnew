"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Layers, Inbox, Trash2, CheckCircle } from "lucide-react";

interface QueueMessage {
  messageId: string;
  url: string;
  createdAt: number;
  body: string;
}

interface QueueData {
  pending: number | null;
  messages: QueueMessage[];
}

export default function QueueMonitorPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<QueueData>({
    queryKey: ["admin-queue-status"],
    queryFn: () => fetch("/api/admin/queue/status").then((r) => r.json()),
    refetchInterval: 10_000,
  });

  async function triggerAction(action: string) {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`${action} completed`, { description: JSON.stringify(result) });
        queryClient.invalidateQueries({ queryKey: ["admin-queue-status"] });
      } else {
        toast.error(`${action} failed`, { description: result.error });
      }
    } catch {
      toast.error(`${action} failed`, { description: "Network error" });
    } finally {
      setLoading(null);
    }
  }

  const messageColumns = [
    { header: "Message ID", cell: (r: QueueMessage) => <span className="font-mono text-xs font-semibold text-gray-600">{r.messageId.slice(0, 12)}...</span> },
    { header: "URL", cell: (r: QueueMessage) => <span className="text-xs truncate max-w-[200px] block text-gray-700 font-medium">{r.url}</span> },
    { header: "Body", cell: (r: QueueMessage) => <span className="text-xs text-gray-500 truncate max-w-[150px] block font-mono">{r.body}</span> },
    { header: "Created", cell: (r: QueueMessage) => <span className="text-xs text-gray-400 font-mono">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Queue Monitor"
        description="Upstash QStash message queue"
        icon={Layers}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerAction("purge-queue")}
              disabled={loading !== null}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              {loading === "purge-queue" ? (
                <span className="animate-pulse">Purging...</span>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Purge Queue
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminKpiCard
          title="Pending Messages"
          icon={Inbox}
          value={data?.pending ?? "-"}
          loading={isLoading}
          status={data?.pending === 0 ? "success" : data?.pending ? "warning" : undefined}
          gradient="blue"
        />
        <AdminKpiCard
          title="Queue Provider"
          icon={Layers}
          value="Upstash QStash"
          loading={isLoading}
          gradient="emerald"
        />
        <AdminKpiCard
          title="Status"
          icon={CheckCircle}
          value={data?.pending !== null ? "Connected" : "Error"}
          loading={isLoading}
          status={data?.pending !== null ? "connected" : "error"}
          gradient="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Pending Messages</h3>
          <AdminDataTable
            columns={messageColumns}
            data={data?.messages}
            loading={isLoading}
            emptyMessage="Queue is empty"
            keyFn={(r) => r.messageId}
          />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Actions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200/80 bg-white shadow-md shadow-gray-200/30">
              <div>
                <p className="text-sm font-bold text-gray-800">Purge All Messages</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove all pending messages from the queue</p>
              </div>
              <Badge variant={data?.pending ? "secondary" : "outline"}
                className={data?.pending ? "bg-amber-50 text-amber-700 border-amber-200" : ""}>
                {data?.pending ?? 0} pending
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
