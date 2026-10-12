
## 2026-10-12: Docker build cache stale — "deployed" tapi kode lama
- Gejala: deploy sukses (image built + container recreated) tapi chunk JS di .next tetap versi lama (timestamp file = build sebelumnya). Verify-by-chunk-hash antre.
- Akar: BuildKit layer cache me-reuse layer COPY src / build meski konten berubah (edge case mtime).
- Fix: `docker compose build --no-cache app` untuk deploy kritis, atau bandingkan `md5` chunk via localhost vs CF sebelum klaim live.
- Aturan: setelah deploy yang mengubah client JS, WAJIB verify string unik kode baru ada di chunk yang diserve (bukan cuma container recreated).
