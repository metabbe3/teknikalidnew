"use client";

import { useRealtimePost } from "@/hooks/use-realtime-post";

export function PostRealtimeWrapper({ postId, children }: { postId: string; children: React.ReactNode }) {
  useRealtimePost(postId);
  return <>{children}</>;
}
