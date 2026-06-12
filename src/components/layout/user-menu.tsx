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

interface UserMenuProps {
  /** The current user from the session. `undefined` means logged out — renders a sign-in link. */
  user: User | undefined | null;
  /** Which set of menu items to render. Defaults to "public" (layout header). */
  variant?: "public" | "dashboard";
}

export function UserMenu({ user, variant = "public" }: UserMenuProps) {
  // Logged-out state: show sign-in button
  if (!user) {
    if (variant === "dashboard") return null;
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
  const profileHref = user.username ? `/profile/${user.username}` : "/dashboard/settings";

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
        {variant === "dashboard" && (
          <span className="hidden md:inline text-sm font-medium text-foreground">
            {user.username ?? user.name ?? "User"}
          </span>
        )}
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

        {variant === "public" ? <PublicMenuItems profileHref={profileHref} role={user.role} /> : <DashboardMenuItems profileHref={profileHref} />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PublicMenuItems({ profileHref, role }: { profileHref: string; role?: string }) {
  return (
    <>
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
      <DropdownMenuItem render={<Link href="/profile/edit" />}>
        Pengaturan
      </DropdownMenuItem>
      {role === "ADMIN" && (
        <DropdownMenuItem render={<Link href="/admin/reports" />}>
          Moderasi
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => signOut()}>
        Keluar
      </DropdownMenuItem>
    </>
  );
}

function DashboardMenuItems({ profileHref }: { profileHref: string }) {
  return (
    <>
      <DropdownMenuItem render={<Link href={profileHref} />}>
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </DropdownMenuItem>
    </>
  );
}
