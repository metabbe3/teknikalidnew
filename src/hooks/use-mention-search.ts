"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface MentionUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  reputation: number;
  isFollowing: boolean;
}

export function useMentionSearch(query: string, debounceMs = 300) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setUsers([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data ?? []);
      }
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query) {
      setUsers([]);
      return;
    }
    timerRef.current = setTimeout(() => search(query), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs, search]);

  return { users, isLoading };
}
