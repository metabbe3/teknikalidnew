# PRD prd-2026-11-05-02 — AGENT FUNNEL: starter alert 1-gratis (hidupkan agent_alert yang 0-baris)

## USER STORY
Sebagai pengguna baru (FREE) bot Telegram TeknikalAgent, aku mau bisa memasang 1 alert harga aktif gratis,
supaya agen proaktif mengirimi aku notifikasi saat level tersentuh — alasan balik harian tanpa harus bayar dulu;
setelah nilai terbukti, upgrade PRO (multi-alert) jadi upsell alami.

## DATACHECK (angka query asli — DB teknikalidnew-db-1 schema agent.*, read-only; tree teknikal-agent main@6412396)
- agent.agent_alert = 0 rows — fitur paling proaktif agen BELUM PERNAH mengirim 1 notifikasi pun sepanjang sejarah.
- Penyebab struktural (bukan bug): seluruh pengguna FREE — agent.agent_user=7 (7 baru dalam 7d), agent.agent_subscription=0 rows, dan internal/alerts/worker.go mengunci alert di balik paywall: const UpgradeUpsellMessage "Fitur Alert Level Teknikal (PRO) ... /upgrade" (worker.go L15-19).
- Mesin SUDAH lengkap & live: internal/alerts/worker.go (periodic price sweep, threshold crossing, quiet-hour deferral, dispatch via queue+notifier, maxPerUser/maxPerDay throttle) — dipanggil cmd/agentd/handler.go (alertWorker) & app_test.go.
- Adopsi awal bot: agent_message_log 71 msg / 4 chats (3-4 Nov); agent_watchlist 2 chats aktif (niat memantau ADA, jalur alert terkunci).
- Pivot 4 Nov (fact #240-241): agent = produk, "agent proaktif ala Hermes" — tapi 0 dari 7 pengguna pernah merasakan sifat proaktif agen. Retensi agent hari-1 belum punya hook.

## ACCEPTANCE CRITERIA (testable)
1. User FREE bisa membuat TEPAT 1 alert aktif (/alert BBCA.JK above 8500); attempt ke-2 membalas UpgradeUpsellMessage + arahan /upgrade (bukan error, bukan diam).
2. Saat sweep worker mendeteksi threshold tersentuh → notifikasi Telegram terkirim ke user FREE: 1 row agent_alert berubah status dispatched + pesan masuk chat (bukti: agent_alert > 0 rows + log worker).
3. Batas alert FREE=1 aktif di-resolve dari billing limits (lokasi eksak di internal/billing — CTO verifikasi; estimasi ResolveLimits/config.go); tanpa migrasi schema (kolom limit runtime, tabel agent_alert sudah ada).
4. Premium/PRO tetap multi-alert (nilai jual /upgrade naik, bukan turun); footer kuota reply tetap akurat.
5. Test: unit test batas FREE=1 + path upsell; full suite 31 paket tetap hijau; eval blast tidak regres (sanitizer/path tidak diubah).

## METADATA DETERMINISTIK v2
target_files: [internal/billing/*.go (ResolveLimits — path estimasi, CTO verifikasi eksak), internal/alerts/worker.go (limit check), cmd/agentd/handler.go (copy /alert FREE), cmd/agentd/app_test.go (test baru)]
db_migrations: false
dependencies: [unknown — tidak ada paket baru; notifier Telegram existing]
risk: low (worker+store ada; hanya ubah limit & copy; TIDAK menyentuh pembayaran/webhook Midtrans)
estimate_tool_calls: 6

## CATATAN CTO
Pivot 4 Nov menjadikan notifikasi proaktif = inti produk; paywall penuh saat 0 pembeli = agent tak pernah demo nilai. Alternatif serupa: alert gratis 7-hari pertama (lebih rumit, butuh TTL) — starter-1-gratis lebih sederhana dan cukup.
