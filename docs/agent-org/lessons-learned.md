# TeknikalID Agent Org — Lessons Learned

Format: tanggal | area | pelajaran | aksi pencegahan. Append-only, tidak rewrite sejarah.
Sumber: insiden nyata selama operasi agent org (bukan teori).

---

## 2026-09-13 | infra | Cron create meninggalkan model=None

`cronjob_manage create` TIDAK menyimpan model/provider dari argumen — job jalan pakai model default global, dan saat model global berganti (mis. glm-5.2→5.3) job unpinned **di-SKIP diam-diam** ("Skipped to prevent unintended spend").
**Pencegahan:** setelah EVERY create, pin manual di `~/.hermes/cron/jobs.json` (field `model`+`provider`) lalu verify read-back. Terjadi 2× (6 job lama, lalu 5 job baru termasuk council).

## 2026-09-13 | tooling | Terminal stale cwd

Terminal session kadang mewarisi cwd `/private/tmp/claude-test` yang sudah dihapus → semua command exit 126 tanpa workdir eksplisit.
**Pencegahan:** agent selalu pass `workdir` eksplisit, atau fallback `execute_code` subprocess. Sudah tertanam di prompt CTO.

## 2026-09-13 | dispatch | CEO menulis route yang salah

CEO menulis intent "/auth/signup"; route aslinya `/auth/register`. Kalau CTO percaya begitu, deploy bakal broken link.
**Pencegahan:** CTO WAJIB verifikasi spec ke repo sebelum eksekusi (baca file asli). Layer translate CEO→CTO memang butuh verify — ketemu pas dry-run.

## 2026-09-12 | data | Query "2 tanggal terakhir" ≠ delta mingguan

Query weekly pakai 2 tanggal terakhir menghasilkan delta HARIAN (11 vs 10 Sep), bukan vs Jumat pekan lalu → caption GLM "salah" padahal setia pada payload salah.
**Pencegahan:** definisi weekly delta = vs tanggal ≥5 hari kalender ke belakang. Validasi angka caption vs payload (`_caption_numbers_ok`) wajib untuk konten finansial.

## 2026-09-12 | content | GLM caption campur angka antar dataset

Caption mingguan GLM menyisipkan angka harian (463/196) + ticker phantom (BMRS) dari konteks training, bukan payload.
**Pencegahan:** semua angka di caption = hasil programmatic check terhadap payload; mismatch → retry → fallback caption deterministik. Akun finansial: angka salah = kredibilitas mati.

## 2026-09-11 | infra | Dashboard baca file berbeda dari yang agent tulis

Agent tulis weight ke log.jsonl, tapi dashboard komposisi baca `inbody-scans.json` → UI stale padahal data "sudah masuk".
**Pencegahan:** setiap pipeline tulis ke SEMUA store yang membacanya (3 tempat), atau satukan sumber baca. Inventarisasi reader-writer tiap data type.

## 2026-09-11 | tooling | f-string Python vs CSS braces

Template HTML di dalam f-string Python = SyntaxError berulang (CSS `{}` bentrok `{{}}` escaping).
**Pencegahan:** template pakai `__TOKEN__` + `.replace()` chain, bukan f-string. Rewrite penuh lebih cepat dari patch-per-line setelah error ke-3.

## 2026-09-13 | org | Riset: aturan yang terbukti (multi-agent)

- **WRITE single-threaded** (Cognition/Devin): parallel READ aman, tapi satu artefak = satu penulis. CTO = satu-satunya penulis kode.
- **Self-referential ban** (Palisade/METR): agent dilarang edit cron/prompt/guardrail sendiri → `blocked_for_owner`.
- **Approval fatigue**: 93% permission prompt di-rubber-stamp manusia — gate manual yang terlalu sering = gak ada gate. Makanya hard rules cuma untuk yang irreversible.
- **Replit DB-wipe**: enforcement harus di luar judgment agent (owner-only list, DB read-only).
- **DORA small batches**: 1 perubahan logis per deploy; 2 deploy/hari cukup konservatif.

## 2026-09-13 | domain | Jam tutup IDX = ~16:00, bukan 15:00

Sesi II sampai 15:49:59 + prapenutupan 16:00 + pascapenutupan 16:15 (JATS terbaru). Quiet zone resmi 09:00–16:15. Data lama di kepala agent = salah — selalu verify jam bursa dari sumber fresh sebelum pasang jadwal.
