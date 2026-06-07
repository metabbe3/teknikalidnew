"use client";

import { useMemo } from "react";
import { generateIdenticonDataUri } from "@/lib/generate-avatar";

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
  email?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function UserAvatar({
  src,
  name,
  username,
  email,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initial = (name || username || "U").charAt(0).toUpperCase();

  const fallbackSrc = useMemo(
    () => generateIdenticonDataUri(email || username || "unknown"),
    [email, username],
  );

  const avatarSrc = src || fallbackSrc;

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 bg-accent/10 ${SIZES[size]} ${className}`}
    >
      <img
        src={avatarSrc}
        alt={name || username || "Avatar"}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // If the image fails to load, fall back to a colored initial
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = document.createElement("span");
          fallback.className = "flex items-center justify-center w-full h-full font-semibold text-accent select-none";
          fallback.textContent = initial;
          target.parentElement?.appendChild(fallback);
        }}
      />
    </div>
  );
}
