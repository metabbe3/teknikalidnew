import { describe, it } from 'node:test';
import assert from 'node:assert';
import { humanizePass, isProtectedBold } from './humanize';

describe('humanizePass — Deterministic Anti-AI Content Sanitizer', () => {
  it('1. Hapus closer satu-baris di akhir paragraf bila muncul >1 kali', () => {
    const input = [
      'BBCA mencatatkan rekor laba bersih pada kuartal berjalan.',
      '',
      'Itulah kuncinya.',
      '',
      'IHSG diprediksi menguji level resistensi 7.300 pekan depan.',
      '',
      'Itulah kuncinya.',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 2);
    assert.doesNotMatch(result.text, /Itulah kuncinya\./);
    assert.match(result.text, /BBCA mencatatkan rekor laba bersih/);
    assert.match(result.text, /IHSG diprediksi menguji level/);
  });

  it('2. Closer satu-baris TIDAK dihapus jika hanya muncul 1 kali (boundary check)', () => {
    const input = [
      'BBCA mencatatkan rekor laba bersih pada kuartal berjalan.',
      '',
      'Itulah kuncinya.',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 0);
    assert.match(result.text, /Itulah kuncinya\./);
  });

  it('3. Ganti kutip keriting “ ” ‘ ’ menjadi lurus " \'', () => {
    const input = 'Strategi “buy on weakness” pada saham ‘blue chip’ terbukti menguntungkan.';
    const result = humanizePass(input);
    assert.strictEqual(result.text, 'Strategi "buy on weakness" pada saham \'blue chip\' terbukti menguntungkan.');
    assert.strictEqual(result.edits, 4);
  });

  it('4. Hapus emoji roket dan panah dekoratif di heading (🚀, ✨, ➡️, ➔)', () => {
    const input = [
      '## 🚀 Analisis Teknikal BBCA 🚀',
      '### Prospek Perbankan ➡️ Q4 ✨',
      '# ➔ Catatan Akhir Tahun',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 3);
    assert.match(result.text, /## Analisis Teknikal BBCA/);
    assert.match(result.text, /### Prospek Perbankan Q4/);
    assert.match(result.text, /# Catatan Akhir Tahun/);
    assert.doesNotMatch(result.text, /[🚀✨➡️➔]/);
  });

  it('5. Pertahankan emoji data fungsional teknikal.id di heading (📊, 📈, 📉, ✅, ⚠️, 💡)', () => {
    const input = [
      '## 📊 Ringkasan Foreign Flow Hari Ini',
      '### 📈 Sinyal Breakout Saham LQ45',
      '### ⚠️ Area Support Kritis IHSG',
      '## ✅ Kesimpulan Teknis',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 0);
    assert.strictEqual(result.text, input);
  });

  it('6. "bukan sekadar X, ini Y" di awal kalimat diubah menjadi "Y" berawalan huruf kapital', () => {
    const input = 'Bukan sekadar kenaikan harga biasa, ini momentum akumulasi institusi asing.';
    const result = humanizePass(input);
    assert.strictEqual(result.text, 'Momentum akumulasi institusi asing.');
    assert.strictEqual(result.edits, 1);
  });

  it('7. "ini bukan sekadar X, melainkan Y" di awal dan tengah kalimat', () => {
    const inputStart = 'Ini bukan sekadar tren sesaat, melainkan perubahan struktural pasar.';
    const resStart = humanizePass(inputStart);
    assert.strictEqual(resStart.text, 'Perubahan struktural pasar.');
    assert.strictEqual(resStart.edits, 1);

    const inputMid = 'Sentimen ini bukan sekadar rumor pasar, melainkan fakta laporan keuangan.';
    const resMid = humanizePass(inputMid);
    assert.strictEqual(resMid.text, 'Sentimen ini fakta laporan keuangan.');
    assert.strictEqual(resMid.edits, 1);
  });

  it('8. "Mari kita (simak|lihat|bahas)" di awal kalimat dihapus dan kata berikutnya dikapitalisasi', () => {
    const input = [
      'Mari kita lihat laporan keuangan BBRI.',
      'Sesi I telah usai. Mari kita bahas pergerakan saham ASII.',
      'Mari kita simak ulasan teknikal berikut.',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 3);
    assert.match(result.text, /^Laporan keuangan BBRI\./m);
    assert.match(result.text, /Sesi I telah usai\. Pergerakan saham ASII\./m);
    assert.match(result.text, /^Ulasan teknikal berikut\./m);
  });

  it('9. Bold dekoratif pada kata acak dibuang asterisk-nya', () => {
    const input = 'Saham ini menunjukkan **kinerja impresif** dengan **pertumbuhan laba** yang solid.';
    const result = humanizePass(input);
    assert.strictEqual(result.text, 'Saham ini menunjukkan kinerja impresif dengan pertumbuhan laba yang solid.');
    assert.strictEqual(result.edits, 2);
  });

  it('10. Hapus residu chatbot: pembuka "Pertanyaan bagus!" dan penutup "Semoga membantu!"', () => {
    const input = [
      'Pertanyaan bagus! Saham BBCA saat ini berada di area support 10.000.',
      '',
      'Semoga membantu!',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 2);
    assert.doesNotMatch(result.text, /Pertanyaan bagus!/);
    assert.doesNotMatch(result.text, /Semoga membantu!/);
    assert.match(result.text, /Saham BBCA saat ini berada di area support 10\.000\./);
  });

  it('11. Penggantian frasa aman: "terkait dengan" -> "soal", "dalam rangka" -> "untuk", "merupakan" -> "adalah"', () => {
    const input = [
      'Informasi terkait dengan dividen BBCA.',
      'Terkait dengan aksi korporasi perseroan.',
      'Langkah ini dalam rangka memperkuat permodalan.',
      'Dalam rangka efisiensi operasional.',
      'BBCA merupakan bank swasta terbesar.',
      'Merupakan hal penting bagi investor.',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 6);
    assert.match(result.text, /Informasi soal dividen BBCA\./);
    assert.match(result.text, /Soal aksi korporasi perseroan\./);
    assert.match(result.text, /Langkah ini untuk memperkuat permodalan\./);
    assert.match(result.text, /Untuk efisiensi operasional\./);
    assert.match(result.text, /BBCA adalah bank swasta terbesar\./);
    assert.match(result.text, /Adalah hal penting bagi investor\./);
  });

  // ================= NEGATIVE TESTS =================

  it('12. [NEGATIF 1] Baris tabel markdown (|...|) TIDAK boleh disentuh sama sekali', () => {
    const tableInput = [
      '| Ticker | Perubahan | **Kinerja** | Status |',
      '| :--- | :--- | :--- | :--- |',
      '| **BBCA** | +2,4% | **sangat baik** | merupakan target |',
      '| **BBRI** | -1,1% | **stabil** | terkait dengan suku bunga |',
    ].join('\n');

    const result = humanizePass(tableInput);
    assert.strictEqual(result.edits, 0);
    assert.strictEqual(result.text, tableInput);
  });

  it('13. [NEGATIF 2] Ticker saham, indeks, dan angka tetap BOLD dan utuh', () => {
    const input = [
      'Saham **BBCA** dan **BBRI.JK** menguat bersama indeks **IHSG** dan **LQ45**.',
      'Laba bersih naik **14,5%** mencapai **Rp 41.250 triliun** pada **Q3 2026**.',
      'Target resistance di level **10.500** dengan support di **Rp 9.800**.',
    ].join('\n');

    const result = humanizePass(input);
    // Ticker dan angka tidak boleh diubah atau dibuang bold-nya
    assert.strictEqual(result.edits, 0);
    assert.strictEqual(result.text, input);
  });

  it('14. [NEGATIF 3] Baris berisi link markdown atau URL tidak boleh disentuh', () => {
    const input = [
      'Kunjungi tautan [Analisis Terkait Dengan BBCA](https://teknikal.id/saham/BBCA) sekarang.',
      'Dokumentasi resmi dapat diakses di https://teknikal.id/akademi?ref=test',
    ].join('\n');

    const result = humanizePass(input);
    assert.strictEqual(result.edits, 0);
    assert.strictEqual(result.text, input);
  });

  it('15. Integrasi End-to-End: Dokumen multi-paragraf dengan kombinasi berbagai pola AI', () => {
    const fullArticle = [
      'Pertanyaan bagus! Mari kita lihat analisis saham BBCA hari ini.',
      '',
      '## 🚀 Analisis Fundamental & Teknikal BBCA 🚀',
      '',
      'BBCA mencatatkan pertumbuhan laba bersih **12,5%** YoY pada kuartal berjalan. Saham ini menunjukkan **kinerja impresif** di sektor keuangan.',
      '',
      'Itulah kuncinya.',
      '',
      'Bukan sekadar kenaikan sesaat, ini momentum akumulasi bandar. Informasi terkait dengan pembagian dividen interim ini dalam rangka memberi nilai tambah bagi pemegang saham.',
      '',
      'BBCA merupakan emiten dengan kapitalisasi pasar terbesar di bursa.',
      '',
      '| Ticker | PBV | **ROE** |',
      '| :--- | :--- | :--- |',
      '| **BBCA** | 4,8x | 21% |',
      '',
      'Itulah kuncinya.',
      '',
      'Simak radar harian di [teknikal.id](https://teknikal.id).',
      '',
      'Semoga membantu!',
    ].join('\n');

    const result = humanizePass(fullArticle);
    assert.ok(result.edits >= 8, `Expected at least 8 edits, got ${result.edits}`);

    // Verifikasi pembersihan
    assert.doesNotMatch(result.text, /Pertanyaan bagus!/);
    assert.doesNotMatch(result.text, /Semoga membantu!/);
    assert.doesNotMatch(result.text, /🚀/);
    assert.doesNotMatch(result.text, /Itulah kuncinya\./);
    assert.doesNotMatch(result.text, /\*\*kinerja impresif\*\*/);
    assert.match(result.text, /kinerja impresif/);
    assert.match(result.text, /Momentum akumulasi bandar\./);
    assert.match(result.text, /soal pembagian dividen/);
    assert.match(result.text, /untuk memberi nilai tambah/);
    assert.match(result.text, /BBCA adalah emiten/);

    // Verifikasi preservasi
    assert.match(result.text, /\*\*12,5%\*\*/);
    assert.match(result.text, /\| \*\*BBCA\*\* \| 4,8x \| 21% \|/);
    assert.match(result.text, /\[teknikal\.id\]\(https:\/\/teknikal\.id\)/);
  });

  it('16. Helper isProtectedBold memvalidasi ticker, indeks, dan angka dengan benar', () => {
    assert.strictEqual(isProtectedBold('BBCA'), true);
    assert.strictEqual(isProtectedBold('BBRI.JK'), true);
    assert.strictEqual(isProtectedBold('GOTO'), true);
    assert.strictEqual(isProtectedBold('IHSG'), true);
    assert.strictEqual(isProtectedBold('LQ45'), true);
    assert.strictEqual(isProtectedBold('12%'), true);
    assert.strictEqual(isProtectedBold('Rp 10.000'), true);
    assert.strictEqual(isProtectedBold('Q3 2026'), true);

    assert.strictEqual(isProtectedBold('kinerja impresif'), false);
    assert.strictEqual(isProtectedBold('momentum'), false);
    assert.strictEqual(isProtectedBold('catatan penting'), false);
  });
});
