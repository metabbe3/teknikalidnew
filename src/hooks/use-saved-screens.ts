"use client";

/**
 * Saved screener screens — guest localStorage "Simpananku" (Retention Loop v1).
 * SSR-safe: list kosong saat render pertama; dibaca useEffect pasca-mount (0 hydration mismatch).
 */
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  readSavedScreens,
  saveScreen as persistScreen,
  removeSavedScreen as removeScreen,
  SAVED_SCREENS_EVENT,
  type SavedScreen,
} from "@/lib/guest-storage";

export function useSavedScreens() {
  const { data: session } = useSession();
  const isGuest = !session?.user;

  const [screens, setScreens] = useState<SavedScreen[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isGuest) return;
    setScreens(readSavedScreens());
    const onChange = () => setScreens(readSavedScreens());
    window.addEventListener(SAVED_SCREENS_EVENT, onChange);
    return () => window.removeEventListener(SAVED_SCREENS_EVENT, onChange);
  }, [isGuest]);

  const save = useCallback(
    (screen: { key: string; label: string; queryString: string }): SavedScreen[] | null => {
      if (!isGuest) return null;
      const next = persistScreen(screen);
      if (next) {
        setScreens(next);
        window.dispatchEvent(new CustomEvent(SAVED_SCREENS_EVENT, { detail: next }));
      }
      return next;
    },
    [isGuest],
  );

  const remove = useCallback(
    (queryString: string): void => {
      if (!isGuest) return;
      const next = removeScreen(queryString);
      setScreens(next);
      window.dispatchEvent(new CustomEvent(SAVED_SCREENS_EVENT, { detail: next }));
    },
    [isGuest],
  );

  return { screens, save, remove, mounted: mounted && isGuest, isGuest };
}
