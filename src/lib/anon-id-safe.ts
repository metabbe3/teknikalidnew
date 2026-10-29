// tracking-audit G2/G7: SATU PINTU anonId utk beacon — localStorage "eng_anon";
// private mode (localStorage throw/null) → id memori sesi (stabil dalam sesi).
let memAnon: string | null = null;
export function getAnonIdSafe(): string {
  try {
    const v = localStorage.getItem("eng_anon");
    if (v) return v;
  } catch { /* private mode */ }
  if (!memAnon) {
    memAnon = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  return memAnon;
}
