/**
 * Self-test untuk src/lib/normalize-ticker-title.ts (PRD prod-2026-09-24-01 / task prd-2026-10-01-02).
 * Run: npx tsx scripts/selftest-title.ts
 *
 * Pattern sama dengan scripts/selftest-retention.ts — assert-based, exit non-zero saat gagal.
 * FIXTURE = snapshot live DB (isActive=true, name > 25 char) dump 2026-10-02, read-only.
 */
import { normalizeTickerTitle } from "../src/lib/normalize-ticker-title";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log("  ✓ " + msg);
  else { failures++; console.error("  ✗ " + msg); }
}

console.log("\n[1] Strip suffix (Persero)/Tbk");
assert(normalizeTickerTitle("Bank Rakyat Indonesia (Persero) Tbk", "BBRI") === "Bank Rakyat Indonesia",
  "'Bank Rakyat Indonesia (Persero) Tbk' -> 'Bank Rakyat Indonesia'");
assert(normalizeTickerTitle("Bank Syariah Indonesia (Persero) Tbk", "BRIS") === "Bank Syariah Indonesia",
  "'Bank Syariah Indonesia (Persero) Tbk' -> 'Bank Syariah Indonesia'");
assert(normalizeTickerTitle("Bank Mandiri", "BMRI") === "Bank Mandiri",
  "'Bank Mandiri' -> 'Bank Mandiri' (unchanged)");

console.log("\n[2] Fallback saat kosong pasca-strip");
assert(normalizeTickerTitle("Persero Tbk", "BBRI") === "BBRI", "'Persero Tbk' -> fallback 'BBRI'");
assert(normalizeTickerTitle("(Persero) Tbk", "BBRI") === "BBRI", "'(Persero) Tbk' -> fallback 'BBRI'");
assert(normalizeTickerTitle("   ", "BBCA") === "BBCA", "whitespace-only -> fallback 'BBCA'");

console.log("\n[3] Cut word-boundary ≤ 35 char");
{
  const long = "Anugerah Pelayaran Nusantara Sejahtera Bina Buana Sentosa Utama";
  const out = normalizeTickerTitle(long, "APLI");
  assert(out.length <= 35, `nama 60+ char -> panjang ≤35 (got ${out.length}: "${out}")`);
  if (out.endsWith("…")) {
    const prefix = out.slice(0, -1);
    // Boundary = original lanjut dengan spasi tepat setelah prefix (bukan sisa kata).
    assert(long.startsWith(prefix) && long[prefix.length] === " ",
      `cut di word boundary, bukan mid-word ("${out}")`);
  } else {
    assert(long.startsWith(out) && (long[out.length] === " " || long[out.length] === undefined),
      `tanpa ellipsis, berhenti utuh di boundary ("${out}")`);
  }
}
{
  // Edge: kata tunggal > 35 char — hard cut 35, mid-word tak terhindarkan (didokumentasi di lib).
  const single = "A".repeat(40);
  const out = normalizeTickerTitle(single, "XXXX");
  assert(out.length === 35, `kata tunggal 40 char -> hard cut 35 (got ${out.length})`);
}

console.log("\n[4] Regression og-space — hasil bebas 'Persero'/'Tbk'");
{
  const out = normalizeTickerTitle("Bank Rakyat Indonesia (Persero) Tbk", "BBRI");
  assert(!out.includes("Persero") && !out.includes("Tbk"), `hasil "${out}" tak mengandung 'Persero'/'Tbk'`);
}

console.log("\n[5] FIXTURE AC4 — populasi affected (live DB dump 2026-10-02)");
const FIXTURE = [
  "Abadi Nusantara Hijau Investam",
  "Adira Dinamika Multi Finance T",
  "Alamtri Minerals Indonesia",
  "Alamtri Resources Indonesia Tb",
  "Amman Mineral Internasional Tb",
  "Ancara Logistics Indonesia",
  "Ancora Indonesia Resources",
  "Anugerah Spareparts Sejahtera",
  "Argha Karya Prima Industry",
  "Ashmore Asset Management Indon",
  "Astrindo Nusantara Infrastrukt",
  "Asuransi Harta Aman Pratama Tb",
  "Asuransi Jiwa Syariah Jasa Mit",
  "Asuransi Maximus Graha Persada",
  "Asuransi Tugu Pratama Indonesi",
  "Ateliers Mecaniques D Indonesi",
  "Bakrie Sumatera Plantations Tb",
  "Bank Artha Graha Internasional",
  "Bank China Construction Bank I",
  "Bank Mayapada Internasional Tb",
  "Bank Negara Indonesia (Persero) Tbk",
  "Bank Pembangunan Daerah Banten",
  "Bank Pembangunan Daerah Jawa B",
  "Bank Pembangunan Daerah Jawa T",
  "Bank Rakyat Indonesia (Persero) Tbk",
  "Bank Syariah Indonesia (Persero) Tbk",
  "Bank Victoria International Tb",
  "Bank Woori Saudara Indonesia 1",
  "Batavia Prosperindo Internasio",
  "Batulicin Nusantara Maritim Tb",
  "Bekasi Fajar Industrial Estate",
  "Bintang Samudera Mandiri Lines",
  "Brigit Biofarmaka Teknologi Tb",
  "Bumi Benowo Sukses Sejahtera T",
  "Cahayasakti Investindo Sukses",
  "Cakra Buana Resources Energi T",
  "Campina Ice Cream Industry",
  "Capital Financial Indonesia Tb",
  "Capitol Nusantara Indonesia Tb",
  "Cashlez Worldwide Indonesia Tb",
  "Centratama Telekomunikasi Indo",
  "Champion Pacific Indonesia",
  "Charoen Pokphand Indonesia",
  "Cilacap Samudera Fishing Indus",
  "Citra Marga Nusaphala Persada",
  "Communication Cable Systems In",
  "Dharma Samudera Fishing Indust",
  "Diagnos Laboratorium Utama",
  "Distribusi Voucher Nusantara T",
  "Dyandra Media International Tb",
  "Enseval Putera Megatrading",
  "Equity Development Investment",
  "Exploitasi Energi Indonesia Tb",
  "Formosa Ingredient Factory",
  "Garuda Maintenance Facility Ae",
  "Garudafood Putra Putri Jaya Tb",
  "Gihon Telekomunikasi Indonesia",
  "Gowa Makassar Tourism Developm",
  "Graha Andrasentra Propertindo",
  "Hasnur Internasional Shipping",
  "Hotel Sahid Jaya International",
  "Humpuss Maritim Internasional",
  "Indocement Tunggal Prakarsa Tb",
  "Indofood CBP Sukses Makmur",
  "Indomobil Sukses Internasional",
  "Indonesia Fibreboard Industry",
  "Indonesia Kendaraan Terminal T",
  "Indonesian Paradise Property T",
  "Indopoly Swakarsa Industry",
  "Indoritel Makmur Internasional",
  "Industri Jamu dan Farmasi Sido",
  "Industri dan Perdagangan Bintr",
  "Informasi Teknologi Indonesia",
  "Ingria Pratama Capitalindo",
  "Intikeramik Alamasri Industri",
  "Jakarta International Hotels &",
  "Jakarta Setiabudi Internasiona",
  "Jaya Konstruksi Manggala Prata",
  "Jaya Sukses Makmur Sentosa",
  "Kentanix Supra International T",
  "Kioson Komersial Indonesia",
  "Logisticsplus International Tb",
  "Lupromax Pelumas Indonesia",
  "MPX Logistics International Tb",
  "MSIG Life Insurance Indonesia",
  "Malacca Trust Wuwungan Insuran",
  "Mandiri Herindo Adiperkasa",
  "Maskapai Reasuransi Indonesia",
  "Medco Energi Internasional",
  "Megalestari Epack Sentosaraya",
  "Metro Healthcare Indonesia",
  "Millennium Pharmacon Internati",
  "Mineral Sumberdaya Mandiri",
  "Minna Padi Investama Sekuritas",
  "Mitra International Resources",
  "Mitrabahtera Segara Sejati",
  "Multi Medika Internasional",
  "Multikarya Asia Pasifik Raya T",
  "Nusa Konstruksi Enjiniring",
  "Nusantara Pelabuhan Handal",
  "Olympus Strategic Indonesia Tb",
  "Optima Prima Metal Sinergi",
  "Oscar Mitra Sukses Sejahtera T",
  "PP London Sumatra Indonesia Tb",
  "Pacific Strategic Financial Tb",
  "Pancaran Samudera Transport Tb",
  "Pelayaran Kurnia Lautan Semest",
  "Pelayaran Nasional Bina Buana",
  "Pelayaran Nasional Ekalya Purn",
  "Pembangunan Graha Lestari Inda",
  "Pertamina Geothermal Energy Tb",
  "Perusahaan Gas Negara (Persero) Tbk",
  "Pioneerindo Gourmet Internatio",
  "Prima Multi Usaha Indonesia Tb",
  "Provident Investasi Bersama Tb",
  "Reliance Sekuritas Indonesia T",
  "Ristia Bintang Mahkotasejati T",
  "Rockfields Properti Indonesia",
  "Royaltama Mulia Kontraktorindo",
  "Sarana Meditama Metropolitan T",
  "Saraswanti Anugerah Makmur",
  "Saraswanti Indoland Developmen",
  "Selaras Citra Nusantara Perkas",
  "Siloam International Hospitals",
  "Sinar Mas Agro Resources and T",
  "Sinergi Inti Andalan Prima",
  "Sona Topas Tourism Industry Tb",
  "Steel Pipe Industry of Indones",
  "Sumber Mineral Global Abadi Tb",
  "Sumber Tani Agung Resources Tb",
  "Sunson Textile Manufacture",
  "Supreme Cable Manufacturing &",
  "Surya Biru Murni Acetylene",
  "Teknologi Karya Digital Nusa T",
  "Tower Bersama Infrastructure T",
  "Trimegah Sekuritas Indonesia T",
  "Trisula Textile Industries",
  "Ultrajaya Milk Industry & Trad",
  "Venteny Fortuna International",
  "Visi Telekomunikasi Infrastruk",
  "WEHA Transportasi Indonesia Tb",
  "Wahana Interfood Nusantara",
  "Wahana Ottomitra Multiartha Tb",
  "Wijaya Karya Bangunan Gedung T",
];
for (const name of FIXTURE) {
  const out = normalizeTickerTitle(name, "BBRI");
  const ok =
    (out.length <= 35 || out === "BBRI") &&          // (a) ≤35 kecuali fallback
    !out.endsWith("(Pe") && !out.endsWith("(P") && !out.endsWith("(") && // (b) bukan potongan '(Pe'/'(P'/'('
    out.length > 0;                                   // (c) tidak kosong
  if (!ok) { failures++; console.error(`  ✗ "${name}" -> "${out}"`); }
}
console.log(`  ✓ fixture tested: ${FIXTURE.length} nama (loop assert di atas, hanya gagal yang diprint)`);

process.exit(failures ? 1 : 0);
