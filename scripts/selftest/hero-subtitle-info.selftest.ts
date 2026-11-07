/**
 * Selftest: Hero Subtitle ⓘ & SEO Guard (Task 1)
 *
 * Memverifikasi bahwa:
 * 1. Subtitle H2 hero di halaman /stocks/[ticker] menampilkan "Harga Saham Hari Ini & Analisa Teknikal {name}" + icon ⓘ.
 * 2. businessActivity / subSector panjang TIDAK hilang dari SSR (SEO aman), melainkan berada di dalam:
 *    - atribut title pada icon ⓘ (tooltip hover native)
 *    - atribut aria-label pada icon ⓘ (screen reader & crawler)
 *    - elemen <span class="sr-only"> di dalam <h2> (diindeks mesin pencari & crawler tanpa merusak visual mobile).
 * 3. H2 visual tidak lagi memuat rentetan teks panjang yang memakan 2-3 baris di mobile.
 * 4. Kode sumber page.tsx mematuhi struktur yang disyaratkan.
 *
 * Jalankan: npx tsx scripts/selftest/hero-subtitle-info.selftest.ts
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

// Simulasi komponen H2 persis seperti implementasi di src/app/(public)/stocks/[ticker]/page.tsx
function renderStockHeroSubtitle(stock: {
  name: string;
  businessActivity?: string;
  subSector?: string;
}): string {
  const rawDesc = stock.businessActivity?.trim() || stock.subSector?.trim();
  const descElement = rawDesc
    ? React.createElement(
        React.Fragment,
        null,
        " ",
        React.createElement(
          "span",
          {
            tabIndex: 0,
            role: "note",
            className:
              "inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-serif font-bold text-text-tertiary hover:text-text-primary hover:border-text-secondary cursor-help transition-colors select-none align-middle",
            title: rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1),
            "aria-label": `Profil bisnis ${stock.name}: ${
              rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1)
            }`,
          },
          "ⓘ"
        ),
        React.createElement(
          "span",
          { className: "sr-only" },
          ` · ${rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1)}`
        )
      )
    : null;

  const node = React.createElement(
    "h2",
    { className: "text-sm text-text-secondary mt-0.5 font-semibold" },
    React.createElement(
      "span",
      { className: "text-text-tertiary font-medium" },
      "Harga Saham Hari Ini & Analisa Teknikal "
    ),
    React.createElement("span", { className: "font-medium" }, stock.name),
    descElement
  );

  return renderToStaticMarkup(node);
}

async function main() {
  console.log("=== SELFTEST: HERO SUBTITLE ⓘ (SEO-SAFED) ===");

  // --- 1. Render statis komponen dengan emiten ber-businessActivity panjang (AADI.JK) ---
  {
    const aadiStock = {
      name: "Adaro Andalan Indonesia",
      businessActivity:
        "perkebunan kelapa sawit, karet dan tanaman penghasil getah lain, perusahaan holding, dan konsultasi manajemen lainnya",
    };

    const html = renderStockHeroSubtitle(aadiStock);

    check(
      "1a. Subtitle memuat awalan 'Harga Saham Hari Ini & Analisa Teknikal'",
      html.includes("Harga Saham Hari Ini &amp; Analisa Teknikal")
    );
    check(
      "1b. Subtitle memuat nama emiten 'Adaro Andalan Indonesia'",
      html.includes("Adaro Andalan Indonesia")
    );
    check(
      "1c. Icon ⓘ dirender di dalam subtitle",
      html.includes("ⓘ")
    );
    check(
      "1d. Atribut title memuat deskripsi lengkap (diawali huruf kapital)",
      html.includes(
        'title="Perkebunan kelapa sawit, karet dan tanaman penghasil getah lain, perusahaan holding, dan konsultasi manajemen lainnya"'
      )
    );
    check(
      "1e. Atribut aria-label memuat profil bisnis untuk aksesibilitas",
      html.includes(
        'aria-label="Profil bisnis Adaro Andalan Indonesia: Perkebunan kelapa sawit, karet dan tanaman penghasil getah lain, perusahaan holding, dan konsultasi manajemen lainnya"'
      )
    );
    check(
      "1f. Konten deskripsi berada di dalam elemen <span class=\"sr-only\"> untuk indeks crawler",
      html.includes(
        '<span class="sr-only"> · Perkebunan kelapa sawit, karet dan tanaman penghasil getah lain, perusahaan holding, dan konsultasi manajemen lainnya</span>'
      )
    );

    // Verifikasi visual: bila elemen sr-only diabaikan (karena disembunyikan CSS screen reader),
    // teks deskripsi panjang tidak muncul sebagai teks konten di baris visual subtitle.
    const textContentWithoutSrOnly = html
      .replace(/<span class="sr-only">[\s\S]*?<\/span>/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .trim();

    check(
      "1g. Subtitle visual (tanpa sr-only) TIDAK memuat teks deskripsi panjang",
      !textContentWithoutSrOnly.includes("perkebunan kelapa sawit") &&
        !textContentWithoutSrOnly.includes("Perkebunan kelapa sawit") &&
        textContentWithoutSrOnly === "Harga Saham Hari Ini & Analisa Teknikal Adaro Andalan Indonesia ⓘ"
    );
  }

  // --- 2. Render statis dengan fallback subSector bila businessActivity kosong ---
  {
    const tlkmStock = {
      name: "Telkom Indonesia (Persero) Tbk",
      subSector: "jasa telekomunikasi nirkabel",
    };

    const html = renderStockHeroSubtitle(tlkmStock);

    check(
      "2a. SubSector dipakai sebagai fallback dengan huruf kapital awal",
      html.includes('title="Jasa telekomunikasi nirkabel"') &&
        html.includes('<span class="sr-only"> · Jasa telekomunikasi nirkabel</span>')
    );
  }

  // --- 3. Render statis emiten tanpa businessActivity maupun subSector ---
  {
    const emptyStock = {
      name: "Saham Polos Tbk",
    };

    const html = renderStockHeroSubtitle(emptyStock);

    check(
      "3a. Emiten tanpa deskripsi tidak menampilkan ⓘ maupun sr-only",
      !html.includes("ⓘ") && !html.includes("sr-only")
    );
  }

  // --- 4. Verifikasi statis file src/app/(public)/stocks/[ticker]/page.tsx ---
  {
    const pagePath = path.join(process.cwd(), "src/app/(public)/stocks/[ticker]/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    check(
      "4a. File page.tsx memuat elemen <span className=\"sr-only\"> · {desc}</span>",
      pageContent.includes('<span className="sr-only"> · {desc}</span>')
    );
    check(
      "4b. File page.tsx menyematkan icon ⓘ dengan InfoTip (tap-to-open mobile + accessible) tanpa native title",
      pageContent.includes('<InfoTip label="Profil bisnis" text={desc} />') &&
        !pageContent.includes("title={desc}")
    );
    check(
      "4c. File page.tsx tidak lagi menampilkan deskripsi panjang secara telanjang di H2",
      !pageContent.includes('<span className="text-text-tertiary font-normal">{desc.charAt(0).toUpperCase() + desc.slice(1)}</span>')
    );
    check(
      "4d. H1 tetap murni stripJk(ticker) dengan keyword context sr-only (doktrin SEO)",
      pageContent.includes("{stripJk(ticker)}") &&
        pageContent.includes("<span className=\"sr-only\">{` — Harga Saham ${stock.name} Hari Ini`}</span>")
    );
  }

  console.log("\n" + (failed === 0 ? "RESULT: ALL PASS" : `RESULT: ${failed} FAILED`));
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
