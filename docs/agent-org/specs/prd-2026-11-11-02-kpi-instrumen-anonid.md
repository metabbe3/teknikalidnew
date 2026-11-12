# PRD prd-2026-11-11-02 — Patch instrumen KPI North Star (returning IP→anonId + ai_search via utmSource)
Date: 2026-11-11 | Source idea: idea-2026-11-10-2 (NSR-9Nov rekomendasi #1) | Status: spec_ready
Tree riset: teknikalidnew main@a93c948; host-script ~/.hermes/scripts/teknikalid_northstar_kpi.py (10.509 B, 3 Nov)

## Problem (baseline 11 Nov, SQL asli)
- returning basis IP resmi = 5,7% (kpi.json 07:05) vs basis anonId riil = 17,1% (140 anonId unik, exclude admin via User.initialAnonId + qa-% prefix) — IP undercount 3x (CGNAT Telkomsel).
- ai_search resmi = 0 (query referrer ILIKE) vs riil via utmSource = 21 views / 15 anon (chatgpt.com) — undercount resmi; GA4/Plausible pakai client-ID, bukan IP.
- Konsumen angka: dashboard :8790 via teknikalid_page.py _kpi_json() → semua keputusan ratchet/retensi dinilai instrumen salah.

## Solusi (host-only, ±15-25 baris, 0 deploy 0 commit repo)
1. teknikalid_northstar_kpi.py: tambah STICKY.returning_anonid_pct
   (basis PageView.anonId; exclude anonId milik User role=ADMIN via initialAnonId + prefix qa-% + isBot) — JANGAN hapus returning_ip_pct (baseline komparatif, beri note basis).
2. AI_SEARCH.ai_search_views_utm_7d: utmSource ~* 'chatgpt|openai|perplexity|claude|gemini|copilot|grok' OR fallback referrer ILIKE existing.
3. teknikalid_page.py kartu North Star: tampilkan returning_anonid_pct (label basis anonId) + ai_search utm.
4. Target 8% dinilai ulang apples-to-apples pasca instrumen live (link idea-2026-11-11-1 ratchet).

## Bukti query (11 Nov, docker exec psql read-only)
- returning_anonid_7d = 17,1% / 140 anonId (exclude adm initialAnonId + qa-%)
- ai_utm_7d: chatgpt.com=21 views, 15 anon; utmSource top 7d: threads=115, chatgpt.com=21, social=16
- PV 7d: utmSource filled=155/1776, referrer filled=1228/1776
- kpi.json 11 Nov 07:05: returning_ip_pct=5,7, ai_search_views_7d=0

## Acceptance criteria
- AC1 kpi.json berikutnya memuat returning_anonid_pct + ai_search_views_utm_7d (field lama tetap ada).
- AC2 replay SQL manual identik dengan angka script (17,1 / 21 pada baseline).
- AC3 kartu North Star :8790 menampilkan kedua angka baru + label basis.
- AC4 baseline lama (IP 5,7 / ai-referrer 0, 11 Nov) tercatat di entry backlog idea-2026-11-10-2.
- AC5 host-only: 0 commit repo teknikalidnew, 0 docker rebuild; dijalankan slot SRE Rabu 12 Nov 09:30.

## Metadata v2
impact:4 (semua keputusan North Star dinilai instrumen ini) | effort:1 | risk:low
db_migrations:false | dependencies:docker exec teknikalidnew-db-1 psql (read-only), kpi.json cache, teknikalid_page.py dashboard
target_files: ~/.hermes/scripts/teknikalid_northstar_kpi.py, ~/.hermes/scripts/teknikalid_page.py
estimate_tool_calls: 10
