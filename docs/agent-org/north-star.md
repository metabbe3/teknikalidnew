# North Star & KPI — teknikal.id (LIVE 14 Okt 2026)

## North Star
**"Pengguna kembali & percaya — aplikasi konsisten, mudah dipakai, datanya reliable."**
Metric inti: **Weekly Returning Visitor Ratio** — % IP non-bot dengan ≥2 kunjungan di hari berbeda (7 hari). Baseline 3.8% (14 Okt) → target **≥8% dalam 6 minggu** (25 Nov).

## KPI per pilar (target = lantai, bukan langit-langit)
| Pilar | KPI | Target | Baseline 14 Okt |
|---|---|---|---|
| STICKY | returning_ip_pct | ≥8% | 3.8% |
| STICKY | dwell_median_s | ≥45s | 60s |
| STICKY | scroll_median_pct | ≥30% | 37% |
| GROWTH | views_nobot_7d | ≥900 | 1120 |
| GROWTH | register_7d | ≥6 | 4 (2 minggu turun) |
| CONTENT | articles_7d | ≥6 | 52 |
| AI_SEARCH | ai_search_views_7d | ≥10 | 8 |
| TRUST | days_zero_views_7d | 0 | 0 |

## Target baru (owner 15 Okt 2026): "Koran Saham Live" → Pro subscriber
**L jalur monetisasi:** trust-first (gates per fase) → /pasar live page + TG push 4x/hari + breaking news → track-record otomatis → Pro Rp10-20rb/bln (Q1'27).
| Fase | KPI baru | Target | Baseline |
|---|---|---|---|
| NOW-Des | impressions_30d | ≥30.000/bln stabil 2 bulan | ~3.000 |
| Fase 2 | pasar_uv_7d (user /pasar) | ≥500 | 0 (belum launch) |
| Fase 2 | tg_channel_members | ≥300 (gate monetisasi) | 0 (channel belum dibuat) |
| Fase 3 | pro_paid_subs | ≥50 (bulanan, % conversion ≥3%) | 0 |

**Prioritas entri P0 di queue:** prd-pasar-live-01 → build MALAM INI (16 Okt window 00:00-05:00), kelar besok. Owner rule: JANGAN build siang hari — high AI usage 3× (z.ai quota); semua build di slot malam.

## Aturan pakai (untuk SEMUA agent)
1. Tiap dispatch/PRD/laporan WAJIB menyebut pilar KPI mana yang dilayani.
2. Pekerjaan tanpa pilar = pertanyakan prioritas (boleh dikerjakan kalau ada alasan eksplisit: tech-debt, compliance, infra).
3. KPI live di dashboard `:8790/northstar` (refresh 07:05) — jangan re-query DB kalau kpi.json <24 jam.
4. Target direview tiap Council Minggu; baseline naik → target naik (ratchet, tidak turun).
