# ITSEC Deep Pentest — Kamis 19 Nov 2026 21:30 WIB

Scope: teknikal.id (hivePOS SKIP — FREEZE owner 1 Nov). Repo `~/Documents/teknikalidnew` @ 81ab1e0 (main) + teknikal-agent @ handler.go. Read-only; tidak ada deploy/config/SQL write.

## 🔴 RED TEAM — fitur baru 7 hari (13–19 Nov)

**Verdict: 5/5 BERSIH. Streak bersih minggu ke-3.**

| Fitur | Commit | Pemeriksaan | Hasil |
|---|---|---|---|
| Search jump chip `#cari-saham` + trust copy 956 | 4eb86be | XSS? focus-steal? input? | ✅ Plain `<a href="#cari-saham">` hash-internal statis; useEffect retry-ladder hanya `.focus()` pada elemen sendiri dengan guard `document.activeElement === el` (anti focus-theft) + cleanup timer/listener benar. 8 file lain = string copy statis. `feed.xml` pakai `escapeXml()` lengkap di title/description/creator/category → no XML injection. |
| Deeplink one-tap `tgAnonSuffix` `__a_<12hex>` | 4a03cc0 (18 Nov) | Identity forgery? hijack? | ✅-dengan-catatan. Suffix dari `localStorage.eng_anon` = pseudo-identitas 48-bit **client-forgeable tanpa signature** → attacker bisa memalsukan atribusi anon-join. Dampak = **polusi metrik funnel / seed watchlist anonim SAJA**: parsing agentd (handler.go:920–951) strict `regexWebAnonSuffix __a_([a-f0-9]{12})$` + `ValidateAnonID`; binding akun nyata lewat jalur TERPISAH isBindToken (32-hex server-issued) — suffix palsu tidak bisa mengambil akun orang lain. Bukan privilege escalation → by-design funnel trade-off, dicatat, no action. |
| linkifyBoldTickers repair lapis-3b | 3b98070 | Link/XSS injection via LLM text? | ✅ Allowlist ticker dari data server, regex `^[A-Z]{4}$`, unit 37/37 — penerusan pola lapis-3 lama. |
| Redirect `/idx-radar` → `/radar` | 015ab76 | Open redirect? | ✅ Audit SEMUA ~30 `destination` di next.config.ts: semuanya string statis; tidak ada interpolasi `:slug`/`:path*` ke destination → open-redirect tidak mungkin dari sini. |
| assert canonical-numbers + org docs | 7fbb14e, d6c0c95, 81ab1e0 | Logic flaw? | ✅ Guard deterministik server-side pre-publish; sisanya docs org-state. |

## 🔵 BLUE TEAM

- **🔴 Offsite backup: ESKALASI-5 hari-17, memburuk** — `rclone about gdrive:` masih `CRITICAL empty token found` + NOTICE shared client_id retired during 2026; DAN job cron `43c3452b406d` **TIDAK ADA LAGI di jobs.json** (terhapus, bukan paused — run lalu masih [paused]). Dump lokal sehat: `~/backups/teknikalid/db-20261119.sql.gz` 60MB `gunzip -t` OK (cron bc592e49f339 harian 01:15 ok). Satu-satunya copy DB = host yang sama. → sec-2026-11-19-02 (P1, blocked_owner_action).
- **Gerbang advisory build DIMATIKAN** — `next.config.ts` `experimental.agentUpgrade:false` (17 Nov, agar hot-swap jalan setelah Next 16.4.3 ter-flag). npm audit prod 19 Nov: **12 vuln (1 HIGH** follow-redirects 1.16.0–1.16.1, fixAvailable). Komentar repo sendiri: "UPGRADE TETAP WAJIB oleh owner di jam maintenance". → sec-2026-11-19-01 (P2).
- **Jebakan backup legacy**: `~/backups/db/teknikalid_*.sql.gz` BERHENTI 21 Juni (output db-backup.sh lama); sumber kanonik = `~/backups/teknikalid/`. Restore darurat jangan salah lokasi. (dicatat di data sec-2026-11-19-02.)
- **env-git: BERSIH** — kedua repo hanya `.env.example` tracked; grep pattern secret hardcoded (sk-/AKIA/ghp_/xox/AIza/PRIVATE KEY) di working tree = 0 match.
- **Deploy verify**: image `teknikalidnew-app` build 19 Nov 06:02 WIB (commit ≤18 Nov terbungkus); app-1 Up 3h healthy, worker Up 23h, db Up 2d. Catatan: commit 19 Nov (3b98070, 4eb86be) belum dalam image — window normal menunggu builder malam, bukan regresi.
- **Ports**: ControlCenter :5000/:7000 + ARD *:3283 + AirPlay = standing risk-accepted owner (known). Sisanya loopback/benar. :8790 dashboard 401-gated.
- **Headers teknikal.id**: CSP lengkap + HSTS preload + XFO DENY + nosniff + referrer-policy ✓ (unchanged). SSL 7 Feb 2027 (80 hari) ✓. hivepos.id MINIMAL headers — parked post-FREEZE, P3 known.
- **Monitoring gap 401/403 anonim**: unchanged (sec-10-29-01 approved, nunggu slot).

## Backlog update (3 entry baru, journal ITSEC-THU-1119, version 97→100, mirror synced)

- `sec-2026-11-19-01` P2 candidate — deps-gate OFF + 12 npm vuln (1 HIGH).
- `sec-2026-11-19-02` P1 blocked_owner_action — offsite backup hari-17 + job terhapus (ESKALASI-5).
- `sec-2026-11-19-03` P3 monitor — RED bersih ×5 (bukti per fitur di atas).

## Tren vs run lalu (16 Nov)

- RED: bersih → bersih (streak-3). Surface attack fitur baru minggu ini lebih kecil (5 vs 12) dan murni UI/client.
- BLUE: **memburuk di 1 sumbu** — offsite backup dari "paused" jadi "job hilang"; plus gerbang advisory build baru dimatikan 17 Nov. Backup lokal justru diverifikasi lebih dalam (lokasi legacy ditemukan).
- backlog sec entries 32 → 35.

## Verdict: 🟡 WASPADA — kode bersih, tapi resiliensi data (offsite) dan hygiene deps sedang dibiarkan turun; keduanya menunggu aksi owner 5 menit.

## Sisa Pertanyaan & Gap

1. **Kapan job offsite terhapus & siapa?** jobs.json tak menyimpan audit trail penghapusan; run-ledger bisa diprobe (`runs.jsonl` grep 43c3452b) — belum dikerjakan (di luar jendela read-only malam ini; kandidat investigasi Senin).
2. `agentUpgrade:false` — apakah owner sudah menjadwalkan jam maintenance upgrade Next? (backlog mencatat wajib; gerbang tetap OFF sampai itu terjadi).
3. Commit 19 Nov (3b98070, 4eb86be) belum ada di image prod — perlu konfirmasi builder malam menangkapnya (di luar shift ini).
4. govulncheck belum terpasang di host — scan Go vuln teknikal-agent hanya manual grep (dep list), tidak ada database vuln; instalasi ditunda (menulis ke GOPATH = di luar read-only ketat malam ini).
5. tgAnonSuffix forgery = diterima by-design; bila metrik funnel anon-join kelak dipakai keputusan produk besar, angka itu harus dianggap lower-bound (bisa di-inflate).
