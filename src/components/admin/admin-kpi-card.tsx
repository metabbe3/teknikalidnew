import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminKpiCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  subtitle?: string;
  status?: "success" | "connected" | "safe" | "stale" | "warning" | "error" | "unknown" | "fresh" | "missing";
  loading?: boolean;
  gradient?: "blue" | "emerald" | "amber" | "rose";
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  connected: "default",
  safe: "default",
  fresh: "default",
  stale: "secondary",
  warning: "secondary",
  missing: "outline",
  error: "destructive",
  unknown: "outline",
};

export function AdminKpiCard({ title, icon: Icon, value, subtitle, status, loading, gradient }: AdminKpiCardProps) {
  const gradientClass = gradient ? `admin-kpi-gradient-${gradient}` : "";
  const accentClass = !gradient && status ? getAccentClass(status) : "";

  return (
    <Card className={`${gradientClass} ${accentClass} transition-all hover:shadow-lg hover:-translate-y-0.5`}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-sm font-medium ${gradient ? "text-white/80" : "text-gray-500"}`}>
          <div className={`p-1.5 rounded-lg ${gradient ? "bg-white/20" : "bg-blue-50"}`}>
            <Icon className={`h-4 w-4 ${gradient ? "text-white" : "text-blue-600"}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className={`h-7 w-24 ${gradient ? "bg-white/20" : ""}`} />
            <Skeleton className={`h-4 w-16 ${gradient ? "bg-white/15" : ""}`} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xl font-bold tabular-nums ${gradient ? "text-white" : "text-gray-900"}`}>
              {value}
            </span>
            {status && (
              <Badge
                variant={gradient ? "outline" : STATUS_VARIANT[status] ?? "outline"}
                className={`capitalize text-xs ${gradient ? "border-white/30 text-white bg-white/15" : ""}`}
              >
                {status}
              </Badge>
            )}
          </div>
        )}
        {subtitle && !loading && (
          <p className={`text-xs mt-1 ${gradient ? "text-white/70" : "text-gray-400"}`}>{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getAccentClass(status: string): string {
  if (["success", "connected", "safe", "fresh"].includes(status)) return "admin-accent-emerald";
  if (["warning", "stale"].includes(status)) return "admin-accent-amber";
  if (["error", "missing"].includes(status)) return "admin-accent-rose";
  return "";
}
