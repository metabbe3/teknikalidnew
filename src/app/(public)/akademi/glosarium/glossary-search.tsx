"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { GLOSSARY_TERMS } from "@/lib/glossary-terms";

export function GlossarySearch() {
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      const list = document.getElementById("glossary-list");
      if (!list) return;

      const sections = list.querySelectorAll<HTMLElement>("section");
      const q = value.toLowerCase().trim();

      if (!q) {
        sections.forEach((section) => {
          section.style.display = "";
          section.querySelectorAll<HTMLElement>("a").forEach((a) => {
            a.style.display = "";
          });
        });
        return;
      }

      sections.forEach((section) => {
        const links = section.querySelectorAll<HTMLElement>("a");
        let hasVisible = false;

        links.forEach((a) => {
          const text = a.textContent?.toLowerCase() ?? "";
          const visible = text.includes(q);
          a.style.display = visible ? "" : "none";
          if (visible) hasVisible = true;
        });

        section.style.display = hasVisible ? "" : "none";
      });
    },
    []
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    const list = document.getElementById("glossary-list");
    if (!list) return;

    list.querySelectorAll<HTMLElement>("section").forEach((section) => {
      section.style.display = "";
      section.querySelectorAll<HTMLElement>("a").forEach((a) => {
        a.style.display = "";
      });
    });
  }, []);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Cari istilah... (misal: RSI, Support, Dividen)"
        className="w-full pl-10 pr-10 py-3 rounded-xl bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 transition-colors"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bg-card text-text-tertiary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
