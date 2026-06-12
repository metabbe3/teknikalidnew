"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserInitials, getRoleLabel } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  username?: string;
  role?: string;
}

export function UserMenu({ user }: { user: User | undefined | null }) {
  // Logged-out state: show sign-in button
  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="hidden sm:inline-flex items-center bg-text-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-text-primary/90 transition-colors press-scale"
      >
        Masuk
      </Link>
    );
  }

  const initials = getUserInitials(user);
  const profileHref = user.username ? `/profile/${user.username}` : "/settings";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-bg-hover transition-colors" />
        }
      >
        <Avatar className="h-7 w-7" size="sm">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="text-xs bg-accent/10 text-accent">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          <div className="flex flex-col gap-1">
            <span>{user.name ?? "User"}</span>
            <Badge variant="outline" className="w-fit text-[10px]">
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href={profileHref} />}>
          Profil Saya
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/watchlist" />}>
          Daftar Pantauan
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/portfolio" />}>
          Portofolio
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/paper-trading" />}>
          Simulasi Trading
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/bottom-fishing" />}>
          Bottom Fishing
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/trading-plan" />}>
          Trading Plan
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          Pengaturan
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <DropdownMenuItem render={<Link href="/admin/reports" />}>
            Moderasi
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
