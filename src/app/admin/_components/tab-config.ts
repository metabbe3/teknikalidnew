import { Activity, Users, MessageSquare, TrendingUp, Target, Shield, UserCog, LineChart } from "lucide-react";

export const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "predictions", label: "Predictions", icon: Target },
  { id: "auth", label: "Auth", icon: Shield },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "usermgmt", label: "User Mgmt", icon: UserCog },
] as const;

export type TabId = (typeof TABS)[number]["id"];
