"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, RefreshCw, Trash2 } from "lucide-react";

const actions = [
  {
    key: "sync-eod",
    label: "Force EOD Sync",
    icon: Zap,
    className: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20",
  },
  {
    key: "sync-intraday",
    label: "Force Intraday Sync",
    icon: RefreshCw,
    className: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/20",
  },
  {
    key: "clear-queue",
    label: "Clear Queue",
    icon: Trash2,
    className: "border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800",
  },
];

export function ManualTriggerButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function trigger(action: string) {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${action} completed`, { description: JSON.stringify(data) });
      } else {
        toast.error(`${action} failed`, { description: data.error });
      }
    } catch {
      toast.error(`${action} failed`, { description: "Network error" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.key}
          variant="outline"
          size="sm"
          onClick={() => trigger(a.key)}
          disabled={loading !== null}
          className={a.className}
        >
          {loading === a.key ? (
            <span className="animate-pulse">Running...</span>
          ) : (
            <>
              <a.icon className="h-3.5 w-3.5 mr-1.5" />
              {a.label}
            </>
          )}
        </Button>
      ))}
    </div>
  );
}
