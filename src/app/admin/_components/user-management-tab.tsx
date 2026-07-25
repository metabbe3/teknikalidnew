"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import {
  Users, Search, Shield, ShieldOff, UserCheck, UserX, Ban, Unlock,
  ArrowUpDown, ChevronLeft, ChevronRight,
} from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  username: string;
  image: string | null;
  role: string;
  isPremium: boolean;
  reputation: number;
  bannedAt: string | null;
  createdAt: string;
  lastActive: string | null;
  _count: { posts: number; comments: number; pageViews: number };
}

interface UsersData {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function UserManagementTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [bannedFilter, setBannedFilter] = useState<string>("");

  const { data, isLoading } = useQuery<UsersData>({
    queryKey: ["admin-users", page, search, roleFilter, bannedFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(bannedFilter && { banned: bannedFilter }),
      });
      const r = await fetch(`/api/admin/users?${params}`);
      if (!r.ok) return undefined;
      const json = await r.json();
      return json.data;
    },
  });

  const userMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const totalUsers = data?.total ?? 0;
  const bannedCount = data?.users.filter((u) => u.bannedAt).length ?? 0;
  const adminCount = data?.users.filter((u) => u.role === "ADMIN").length ?? 0;
  const premiumCount = data?.users.filter((u) => u.isPremium).length ?? 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard
          title="Total Users"
          icon={Users}
          value={String(totalUsers)}
          gradient="blue"
          loading={isLoading}
        />
        <AdminKpiCard
          title="Admins"
          icon={Shield}
          value={String(adminCount)}
          gradient="amber"
          loading={isLoading}
        />
        <AdminKpiCard
          title="Premium"
          icon={UserCheck}
          value={String(premiumCount)}
          gradient="emerald"
          loading={isLoading}
        />
        <AdminKpiCard
          title="Banned"
          icon={Ban}
          value={String(bannedCount)}
          gradient="rose"
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 flex-1 min-w-[200px]">
          <Input
            placeholder="Search name, username, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleSearch}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={roleFilter === "" ? "default" : "outline"}
            onClick={() => { setRoleFilter(""); setPage(1); }}
          >
            All Roles
          </Button>
          <Button
            size="sm"
            variant={roleFilter === "ADMIN" ? "default" : "outline"}
            onClick={() => { setRoleFilter("ADMIN"); setPage(1); }}
          >
            <Shield className="h-3 w-3 mr-1" /> Admin
          </Button>
          <Button
            size="sm"
            variant={roleFilter === "USER" ? "default" : "outline"}
            onClick={() => { setRoleFilter("USER"); setPage(1); }}
          >
            <Users className="h-3 w-3 mr-1" /> User
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={bannedFilter === "" ? "default" : "outline"}
            onClick={() => { setBannedFilter(""); setPage(1); }}
          >
            All Status
          </Button>
          <Button
            size="sm"
            variant={bannedFilter === "true" ? "default" : "outline"}
            onClick={() => { setBannedFilter("true"); setPage(1); }}
          >
            <Ban className="h-3 w-3 mr-1" /> Banned
          </Button>
        </div>
      </div>

      {/* User List */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">Loading users...</div>
          ) : !data?.users.length ? (
            <div className="p-8 text-center text-gray-400">No users found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    user.bannedAt ? "bg-red-50/50" : ""
                  }`}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs font-bold">
                      {(user.name || user.username).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {user.name || user.username}
                      </span>
                      {user.role === "ADMIN" && (
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          ADMIN
                        </span>
                      )}
                      {user.isPremium && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                      {user.bannedAt && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          BANNED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      @{user.username} · {user.email}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <div className="text-center">
                      <div className="font-bold text-gray-700 tabular-nums">{user._count.pageViews}</div>
                      <div className="text-[10px]">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-700 tabular-nums">{user._count.posts}</div>
                      <div className="text-[10px]">Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-700 tabular-nums">{user.reputation}</div>
                      <div className="text-[10px]">Rep</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="text-gray-600">
                        {user.lastActive
                          ? new Date(user.lastActive).toLocaleDateString()
                          : "Never"}
                      </div>
                      <div className="text-[10px]">Last Active</div>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {user.bannedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => userMutation.mutate({ userId: user.id, action: "unban" })}
                        disabled={userMutation.isPending}
                      >
                        <Unlock className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => userMutation.mutate({ userId: user.id, action: "ban" })}
                        disabled={userMutation.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {user.role === "ADMIN" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => userMutation.mutate({ userId: user.id, action: "demote" })}
                        disabled={userMutation.isPending}
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => userMutation.mutate({ userId: user.id, action: "promote" })}
                        disabled={userMutation.isPending}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
