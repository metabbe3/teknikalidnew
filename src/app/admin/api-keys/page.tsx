"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { Key, Wifi, Database, Layers, ShieldCheck, Zap } from "lucide-react";

interface ServiceHealth {
  yahoo: { status: string; latency: number };
  db: { status: string; latency: number };
  qstash: { status: string };
  sentry: { configured: boolean };
}

interface EnvStatus {
  DATABASE_URL: boolean;
  YAHOO_FINANCE_API: boolean;
  QSTASH_TOKEN: boolean;
  SENTRY_DSN: boolean;
  ADMIN_SECRET: boolean;
  CRON_SECRET: boolean;
}

interface HealthData {
  services: ServiceHealth;
  envVars: EnvStatus;
  timestamp: string;
}

export default function ApiKeysPage() {
  const [testing, setTesting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<HealthData>({
    queryKey: ["admin-health-checks"],
    queryFn: () => fetch("/api/admin/health-checks").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  async function testService(action: string) {
    setTesting(action);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`${action} test passed`, { description: JSON.stringify(result) });
      } else {
        toast.error(`${action} test failed`, { description: result.error });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-health-checks"] });
    } catch {
      toast.error(`${action} test failed`, { description: "Network error" });
    } finally {
      setTesting(null);
    }
  }

  const envEntries = data?.envVars
    ? Object.entries(data.envVars).map(([key, configured]) => ({ key, configured }))
    : [];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="API Keys & Services"
        description="External service connectivity and environment status"
        icon={Key}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard
          title="Yahoo Finance"
          icon={Wifi}
          value={data?.services.yahoo.status === "connected" ? "Connected" : "Error"}
          subtitle={data?.services.yahoo.latency ? `${data.services.yahoo.latency}ms` : undefined}
          loading={isLoading}
          status={data?.services.yahoo.status === "connected" ? "connected" : "error"}
          gradient="blue"
        />
        <AdminKpiCard
          title="PostgreSQL"
          icon={Database}
          value={data?.services.db.status === "connected" ? "Connected" : "Error"}
          subtitle={data?.services.db.latency ? `${data.services.db.latency}ms` : undefined}
          loading={isLoading}
          status={data?.services.db.status === "connected" ? "connected" : "error"}
          gradient="emerald"
        />
        <AdminKpiCard
          title="Upstash QStash"
          icon={Layers}
          value={data?.services.qstash.status === "connected" ? "Connected" : "Error"}
          loading={isLoading}
          status={data?.services.qstash.status === "connected" ? "connected" : "error"}
          gradient="amber"
        />
        <AdminKpiCard
          title="Sentry"
          icon={ShieldCheck}
          value={data?.services.sentry.configured ? "Configured" : "Not Set"}
          loading={isLoading}
          status={data?.services.sentry.configured ? "connected" : "unknown"}
          gradient="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Service Tests</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <p className="text-sm font-medium text-gray-800">Yahoo Finance API</p>
                <p className="text-xs text-gray-400">Test quote fetch for BBCA.JK</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testService("test-yahoo")}
                disabled={testing !== null}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                {testing === "test-yahoo" ? (
                  <span className="animate-pulse">Testing...</span>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Environment Variables</h3>
          <div className="space-y-2">
            {envEntries.map(({ key, configured }) => (
              <div key={key} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                <span className="text-sm font-mono text-gray-700">{key}</span>
                <Badge className={configured ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}>
                  {configured ? "Set" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
