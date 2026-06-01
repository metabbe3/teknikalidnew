"use client";

import { getAvatarUrl } from "@/lib/avatar";

const SIZES = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-6 h-6 text-[9px]",
  md: "w-7 h-7 text-xs",
  lg: "w-8 h-8 text-sm",
  xl: "w-10 h-10 text-base",
  "2xl": "w-16 h-16 text-xl",
} as const;

interface UserAvatarProps {
  src: string | null | undefined;
  name?: string | null;
  username?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function UserAvatar({
  src,
  name,
  username,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initial = (name || username || "U").charAt(0).toUpperCase();

  if (!src) {
    return (
      <div
        className={`rounded-full shrink-0 bg-accent/10 flex items-center justify-center font-semibold text-accent ${SIZES[size]} ${className}`}
      >
        <span className="select-none" aria-hidden="true">{initial}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 bg-accent/10 ${SIZES[size]} ${className}`}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );
}
