/**
 * Funnel label konstanta — SATU PINTU definisi tahap funnel (prd-2026-11-15-01 AC3).
 *
 * Sebelumnya label T3 "saved" ditulis inline di CTE funnel-v2 route; PRD
 * menemukan definisi T3 inkonsisten (klik-TG dihitung di satu lokasi, tidak
 * di lokasi lain). Konstanta ini dipakai funnel-v2 route (dan lokasi SQL
 * mana pun yang menghitung saver) supaya menambah label = satu tempat.
 *
 * pantau_hapus = unsaved (klik ke-2 pada bintang) — BUKAN bagian T3.
 */
export const T3_SAVE_LABELS = ["pantau_tambah", "tg_pantau_klik"] as const;
export type T3SaveLabel = (typeof T3_SAVE_LABELS)[number];
