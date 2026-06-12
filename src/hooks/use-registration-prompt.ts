"use client";

import { useCallback, useRef } from "react";

interface VisitorState {
  firstVisitAt: number;
  totalPageViews: number;
  stockVisits: Record<string, number>;
  lastVisitedTickers: string[];
  lastVisitAt: number;
  dismissedSheetAt: number | null;
}

const STORAGE_KEY = "teknikal:visitor";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function createInitialState(): VisitorState {
  return {
    firstVisitAt: Date.now(),
    totalPageViews: 1,
    stockVisits: {},
    lastVisitedTickers: [],
    lastVisitAt: Date.now(),
    dismissedSheetAt: null,
  };
}

function readState(): VisitorState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return JSON.parse(raw) as VisitorState;
  } catch {
    return createInitialState();
  }
}

function writeState(state: VisitorState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently ignore storage errors (quota exceeded, etc.)
  }
}

export function useRegistrationPrompt() {
  const stateRef = useRef<VisitorState | null>(null);

  const getState = useCallback((): VisitorState => {
    if (!stateRef.current) {
      stateRef.current = readState();
    }
    return stateRef.current;
  }, []);

  const trackPageView = useCallback((ticker?: string) => {
    const state = readState();

    state.totalPageViews += 1;
    state.lastVisitAt = Date.now();

    if (ticker) {
      state.stockVisits[ticker] = (state.stockVisits[ticker] ?? 0) + 1;

      // Keep last 5 unique tickers
      const filtered = state.lastVisitedTickers.filter((t) => t !== ticker);
      state.lastVisitedTickers = [ticker, ...filtered].slice(0, 5);
    }

    writeState(state);
    stateRef.current = state;
  }, []);

  const shouldShowInlinePrompt = useCallback(
    (ticker: string): boolean => {
      const state = getState();
      const visits = state.stockVisits[ticker] ?? 0;

      // Check if dismissed for this ticker
      try {
        const dismissed = localStorage.getItem(
          `teknikal:inline_dismissed:${ticker}`
        );
        if (dismissed) return false;
      } catch {
        // ignore
      }

      return visits >= 3;
    },
    [getState]
  );

  const shouldShowBottomSheet = useCallback((): boolean => {
    const state = getState();

    if (state.totalPageViews < 5) return false;

    if (
      state.dismissedSheetAt !== null &&
      Date.now() - state.dismissedSheetAt < ONE_DAY_MS
    ) {
      return false;
    }

    // Don't show if last visit was within 30 seconds (avoid showing on rapid navigations)
    if (Date.now() - state.lastVisitAt < 30_000) return false;

    return true;
  }, [getState]);

  const dismissBottomSheet = useCallback(() => {
    const state = readState();
    state.dismissedSheetAt = Date.now();
    writeState(state);
    stateRef.current = state;
  }, []);

  const dismissInlinePrompt = useCallback((ticker: string) => {
    try {
      localStorage.setItem(`teknikal:inline_dismissed:${ticker}`, "1");
    } catch {
      // ignore
    }
  }, []);

  const getLastVisitedTicker = useCallback((): string | null => {
    const state = getState();
    return state.lastVisitedTickers[0] ?? null;
  }, [getState]);

  const isReturningVisitor = useCallback((): boolean => {
    const state = getState();
    return Date.now() - state.firstVisitAt > ONE_DAY_MS;
  }, [getState]);

  const getVisitorState = useCallback((): VisitorState | null => {
    return getState();
  }, [getState]);

  return {
    trackPageView,
    shouldShowInlinePrompt,
    shouldShowBottomSheet,
    dismissBottomSheet,
    dismissInlinePrompt,
    getLastVisitedTicker,
    isReturningVisitor,
    getVisitorState,
  };
}
