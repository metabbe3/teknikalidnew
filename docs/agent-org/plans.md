# TeknikalID Agent Org — Plans

Semua plan/keputusan arsitektur jangka panjang agent org teknikal.id.

Format file: `YYYY-MM-DD-<topik>.md` — konteks, keputusan, acceptance criteria, checklist `- [ ]`.

## 2026-09-13 — Agent Org v1 (8 agent, full autonomy)

**Mandat owner:** run 24 jam tanpa izin. Target: growth, time-spent, returning. Semua ubah website via claude code. Dokumentasi terpusat di repo ini (`docs/agent-org/`).

**Struktur (Semua pinned, glm-5.3 / glm-5.3-flash per tier):**
- Mandor 06:30 (konten, 5.3) → Reviewer 07:00 (QA flash) → CTO pagi 07:30 (freshness gate + deploy, 5.3) → CEO 08:15 (strategi, 5.3) → [quiet zone 09:00–16:15] → CTO sore 16:45 (5.3) → IG Carousel 17:30 (flash) → CEO Evening 21:00 (flash)
- Minggu 08:00 Strategy Council (retro + arah pekan, 5.3)
- Watchdog */15 + SEO Monitor Senin (script-only)

**Protokol:**
- CEO tulis intent+acceptance criteria → `cto-queue.json` → CTO translate spec teknis (verifikasi repo!) → claude code pipeline → verify independen (tsc/grep/curl) → deploy (window 07:30–08:45 / 16:45+) → rollback kalau rusak.
- Max 2 deploy/hari. DB read-only. Owner-only: auth/payment/security/env/monetisasi/hapus konten/beli service/edit cron agent.
- Lesson learned → `lessons-learned.md` (append-only).
- Council Minggu: retro WORKS/DOESN'T/CONFUSING/STOP → max 3 prioritas → dispatch.

**File kanonik (di repo ini, symlink dari ~/.hermes/data/teknikalid-growth/):**
- `decisions.md` — log keputusan harian (CEO/CTO/Council/Reviewer)
- `cto-queue.json` — task queue CTO
- `lessons-learned.md` — postmortem/pelajaran
- `plans.md` — file ini
