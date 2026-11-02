"use client";

/**
 * AuthProvider + guest-migration v2 (Retention Loop v1 AC3 + PRD prd-2026-10-26-02).
 * Saat guest berubah menjadi authenticated (login ATAU register via complete-profile),
 * simpanan guest dimigrasikan ke akun:
 *   - watchlist → POST /api/watchlist/batch {tickers} — skipDuplicates = dedupe @@unique(userId,stockTicker)
 *   - presets "Simpananku" → POST /api/screener/saved {name, filters} per preset — 409 name-exists = skip (idempoten)
 * Flag migrasi PISAH per jenis (v2): user yang sudah migrasi watchlist v1 (flag lama)
 * tetap dapat migrasi presets — data tidak hilang karena flag tunggal.
 * Payload dinormalisasi + di-cap di buildMigratePayload (satu pintu, ter-unit-test).
 * localStorage hanya dibersihkan SETELAH insert terkonfirmasi; kegagalan jaringan = coba lagi login berikutnya.
 */
import { useEffect, useRef } from "react";
import { useSession, SessionProvider } from "next-auth/react";
import {
  buildMigratePayload,
  clearGuestWatchlist,
  clearSavedScreens,
  GUEST_WATCHLIST_EVENT,
  SAVED_SCREENS_EVENT,
  type MigratePayload,
} from "@/lib/guest-storage";
import { trackCtaEvent } from "@/components/engagement-instrument";

const MIGRATED_WL_FLAG_KEY = "teknikal_guest_watchlist_migrated"; // v1 (watchlist saja) — kompat
const MIGRATED_PRESET_FLAG_KEY = "teknikal_guest_presets_migrated"; // v2

function flagDone(key: string, userId: string): void {
  try {
    window.localStorage.setItem(key, userId);
  } catch {
    // private-mode Safari: best-effort — migrasi idempoten server-side, aman diulang
  }
}

function GuestMigrator() {
  const { data: session, status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || done.current) return;
    const userId = session.user.id;

    let payload: MigratePayload = { watchlist: [], presets: [], isEmpty: true };
    try {
      payload = buildMigratePayload();
    } catch {
      payload = { watchlist: [], presets: [], isEmpty: true };
    }

    // v2: gating = KEBERADAAN DATA, bukan flag. Flag v1 per-userId punya bug warisan:
    // logout → guest menambah simpanan → login lagi = flag sudah terpasang → data baru
    // TIDAK pernah dimigrasi. Idempotensi dijamin server (skipDuplicates + 409 name-exists),
    // jadi re-migrasi aman; flag tetap ditulis utk observabilitas.
    const wlTodo = payload.watchlist.length > 0;
    const presetTodo = payload.presets.length > 0;

    if (!wlTodo && !presetTodo) {
      // AC4 no-op bersih: tidak ada simpanan guest — 0 fetch, 0 query, 0 error
      return;
    }

    done.current = true;
    (async () => {
      let migrated = 0;
      try {
        // 1) Watchlist (reuse endpoint batch existing — skipDuplicates dedupe server-side)
        if (wlTodo) {
          const res = await fetch("/api/watchlist/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tickers: payload.watchlist }),
          });
          if (!res.ok) throw new Error(`watchlist HTTP ${res.status}`);
          migrated += payload.watchlist.length;
          clearGuestWatchlist();
          flagDone(MIGRATED_WL_FLAG_KEY, userId);
          window.dispatchEvent(new CustomEvent(GUEST_WATCHLIST_EVENT, { detail: [] }));
        }

        // 2) Presets (reuse /api/screener/saved; 409 name-exists = sudah ada = sukses idempoten)
        if (presetTodo) {
          let failed = 0;
          for (const preset of payload.presets) {
            const filters = Object.fromEntries(new URLSearchParams(preset.queryString));
            try {
              const res = await fetch("/api/screener/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: preset.name, filters }),
              });
              if (res.ok || res.status === 409) migrated += 1;
              else failed += 1;
            } catch {
              failed += 1; // lanjut preset berikutnya — sisanya jangan ikut hilang
            }
          }
          // Clear HANYA bila semua insert terkonfirmasi (yang sukses re-POST login
          // berikutnya = 409 skip, idempoten). Partial-failure = data dipertahankan.
          if (failed === 0) {
            clearSavedScreens();
            flagDone(MIGRATED_PRESET_FLAG_KEY, userId);
            window.dispatchEvent(new CustomEvent(SAVED_SCREENS_EVENT, { detail: [] }));
          }
        }

        // AC3: telemetri guest_migrate_done (nilai = jumlah item termigrasi)
        trackCtaEvent("guest_migrate_done");
      } catch {
        // jaringan gagal — localStorage TIDAK dibersihkan, dicoba lagi login berikutnya
        done.current = false;
      }
    })();
  }, [status, session]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchWhenOffline={false}
      refetchOnWindowFocus={false}
    >
      <GuestMigrator />
      {children}
    </SessionProvider>
  );
}
