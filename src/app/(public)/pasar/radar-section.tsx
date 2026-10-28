"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RadarItem {
  ticker: string;
  name?: string;
  cat: "value" | "cross" | "foreign";
  signalLabel?: string | null;
  signalScore?: number | null;
  pe?: string | null;
  note?: string;
}

const CAT_META: Record<RadarItem["cat"], { title: string; desc: string }> = {
  value: { title: "Value", desc: "fundamental murah + sinyal positif" },
  cross: { title: "EMA Cross", desc: "persilangan tren baru minggu ini" },
  foreign: { title: "Akumulasi Asing", desc: "net beli asing 7 hari" },
};

/**
 * Radar Sinyal (retention-2026-10-28) — kandidat scanner analyst (±20/hari),
 * SATU PINTU: baca /api/radar yang membaca scan JSON fisik; tidak menghitung ulang.
 * Edukasi: daftar hasil scan otomatis — bukan rekomendasi. Bahasa awam.
 */
export function RadarSection() {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [meta, setMeta] = useState<{ generatedWib: string | null; session: string | null }>({ generatedWib: null, session: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/radar")
      .then((r) => r.json())
      .then((d) => { if (alive) { setItems(d.radar ?? []); setMeta({ generatedWib: d.generatedWib ?? null, session: d.session ?? null }); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  if (!loaded || items.length === 0) return null;
  const cats: RadarItem["cat"][] = ["value", "cross", "foreign"];

  return (
    <section aria-labelledby="radar-heading">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="radar-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Radar className="h-4 w-4 text-accent" aria-hidden /> Radar Sinyal Hari Ini
        </h2>
        <span className="text-xs text-text-tertiary">
          {items.length} kandidat{meta.generatedWib ? ` · scan ${meta.generatedWib} WIB` : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cats.map((cat) => {
          const rows = items.filter((x) => x.cat === cat).slice(0, 8);
          if (!rows.length) return null;
          return (
            <Card key={cat}>
              <CardContent className="py-3">
                <h3 className="text-sm font-semibold mb-0.5">{CAT_META[cat].title}</h3>
                <p className="text-[11px] text-text-tertiary mb-2">{CAT_META[cat].desc}</p>
                <ul className="divide-y divide-border">
                  {rows.map((r) => (
                    <li key={r.ticker}>
                      <Link href={`/stocks/${r.ticker}.JK`} className="flex items-center justify-between gap-2 py-2 group">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold group-hover:text-accent">{r.ticker}</span>
                          {r.name && <span className="block text-[11px] text-text-tertiary truncate">{r.name}</span>}
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block text-xs font-semibold tabular-nums">
                            {r.signalScore != null ? r.signalScore.toFixed(2) : r.signalLabel ?? ""}
                          </span>
                          <span className="block text-[10px] text-text-tertiary">
                            {r.cat === "value" && r.pe ? `PER ${r.pe}` : r.note ?? r.signalLabel ?? ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        Radar adalah hasil pemindaian otomatis seluruh emiten (non-gorengan) — bukan rekomendasi beli.
        Tiga terkuat dibahas tuntas di rubrik <Link className="text-accent hover:underline" href="/berita">Analis</Link> tiap pagi dan sore.
      </p>
    </section>
  );
}
