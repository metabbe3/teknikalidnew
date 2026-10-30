import { Activity, Users, MessageSquare, TrendingUp, Target, Shield, UserCog, LineChart, Lightbulb } from "lucide-react";

export const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "predictions", label: "Predictions", icon: Target },
  { id: "auth", label: "Auth", icon: Shield },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "insight", label: "Insight", icon: Lightbulb },
  { id: "usermgmt", label: "User Mgmt", icon: UserCog },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/**
 * Tab yang disembunyikan dari bar tab Dashboard (owner approve demote 30 Okt 2026,
 * entry bo-2026-10-26-02): telemetri komunitas/prediksi masih 0 pemakaian — noise
 * visual. Halaman shim /admin/community + /admin/predictions (URL langsung) tetap
 * jalan. Aktifkan lagi (kosongkan array) saat Post total > 50 atau komunitas hidup.
 */
export const HIDDEN_TABS: readonly TabId[] = ["community", "predictions"];

export const VISIBLE_TABS = TABS.filter((t) => !HIDDEN_TABS.includes(t.id));
