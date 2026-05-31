"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Newspaper, GraduationCap, Megaphone, PenTool, Search, X } from "lucide-react";

type GenType = "stock_analysis" | "educational" | "news" | "general";
type KeywordResearch = {
  suggestedKeywords: string[];
  trendingAngles: string[];
  relatedTopics: string[];
};
type GenResult = { data: { id: string; title: string; slug: string } };

const GEN_TYPES: { key: GenType; label: string; desc: string; icon: typeof Newspaper; color: string }[] = [
  { key: "stock_analysis", label: "Stock Analysis", desc: "Real indicator data", icon: Newspaper, color: "blue" },
  { key: "educational", label: "Educational", desc: "Trading concepts", icon: GraduationCap, color: "purple" },
  { key: "news", label: "News / Market", desc: "Market news & updates", icon: Megaphone, color: "amber" },
  { key: "general", label: "Custom", desc: "Any topic you want", icon: PenTool, color: "teal" },
];

const NEWS_SUGGESTIONS = [
  "Ringkasan pasar mingguan",
  "Analisa sektor perbankan",
  "Saham IPO terbaru",
  "Musim dividen 2026",
  "Arus dana asing minggu ini",
  "Outlook IHSG bulan depan",
];

export default function GenerateArticlePage() {
  const [genType, setGenType] = useState<GenType>("stock_analysis");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [style, setStyle] = useState<string>("professional");
  const [research, setResearch] = useState<KeywordResearch | null>(null);
  const [result, setResult] = useState<GenResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const researchMut = useMutation({
    mutationFn: async (): Promise<{ data: KeywordResearch }> => {
      const query = customTopic || selectedTopic || selectedTicker;
      const res = await fetch("/api/admin/articles/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Research failed");
      return res.json();
    },
    onSuccess: (data) => {
      setResearch(data.data);
    },
    onError: (err) => setError(err.message),
  });

  const generateMut = useMutation({
    mutationFn: async (): Promise<GenResult> => {
      const body: Record<string, unknown> = { type: genType };
      if (genType === "stock_analysis") body.ticker = selectedTicker;
      else if (genType === "educational") body.topicId = selectedTopic;
      else {
        body.topic = customTopic;
        body.keywords = keywords;
        if (research?.trendingAngles?.length) body.trendingAngles = research.trendingAngles;
        if (genType === "general" && style) body.style = style;
      }
      const res = await fetch("/api/admin/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }
      return res.json();
    },
    onSuccess: (data) => { setResult(data.data); setError(null); },
    onError: (err) => { setError(err.message); setResult(null); },
  });

  const canGenerate =
    genType === "stock_analysis" ? !!selectedTicker
    : genType === "educational" ? !!selectedTopic
    : !!customTopic;

  const resetAll = () => {
    setResult(null); setError(null); setResearch(null);
    setSelectedTicker(""); setSelectedTopic("");
    setCustomTopic(""); setKeywords([]);
  };

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setKeywordInput("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <AdminPageHeader title="Generate Article" description="AI-powered SEO content with keyword research" icon={PenTool} />

      <Link href="/admin/articles" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
        <ArrowLeft className="h-3 w-3" />
        Back to Articles
      </Link>

      {/* Step 1: Type selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Step 1: Choose Type</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GEN_TYPES.map(({ key, label, desc, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setGenType(key); resetAll(); }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                genType === key
                  ? `border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <Icon className={`h-4 w-4 mb-1 ${genType === key ? "text-blue-600" : "text-gray-400"}`} />
              <p className="font-bold text-xs text-gray-900">{label}</p>
              <p className="text-[10px] text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Configure */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Step 2: Configure</p>

        {genType === "stock_analysis" && (
          <Card>
            <CardContent className="p-4">
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select IDX40 stock --</option>
                {IDX40_STOCKS.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker.replace(".JK", "")} — {s.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {genType === "educational" && (
          <Card>
            <CardContent className="p-4">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Select educational topic --</option>
                {EDU_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {(genType === "news" || genType === "general") && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder={genType === "news" ? "e.g. Analisa sektor perbankan minggu ini" : "Any topic you want..."}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {genType === "news" && (
                <div className="flex flex-wrap gap-1">
                  {NEWS_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setCustomTopic(s)}
                      className="text-[10px] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Keywords */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Keywords</p>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword(keywordInput))}
                    placeholder="Type keyword, press Enter"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button size="sm" variant="outline" onClick={() => addKeyword(keywordInput)} className="text-xs">
                    Add
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {keywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        {kw}
                        <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))} className="hover:text-blue-800">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {genType === "general" && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Style</p>
                  <div className="flex gap-2">
                    {["professional", "casual", "tutorial"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          style === s ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 text-gray-500 hover:border-blue-300"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Step 3: Research (optional) */}
      {canGenerate && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Step 3: Research Keywords (Optional)</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs mb-3"
            onClick={() => researchMut.mutate()}
            disabled={researchMut.isPending}
          >
            {researchMut.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Researching...</>
            ) : (
              <><Search className="h-3 w-3" /> Research Keywords</>
            )}
          </Button>

          {research && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Suggested Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {research.suggestedKeywords.map((kw) => (
                      <button
                        key={kw}
                        onClick={() => addKeyword(kw)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          keywords.includes(kw) ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
                {research.trendingAngles.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Trending Angles</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {research.trendingAngles.map((a) => (
                        <li key={a} className="flex items-start gap-1">
                          <span className="text-amber-500 mt-0.5">•</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {research.relatedTopics.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Related Topics (for future articles)</p>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      {research.relatedTopics.map((t) => (
                        <li key={t}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Generate */}
      {canGenerate && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Step 4: Generate</p>
          <Button
            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/20 transition-all"
            size="lg"
            disabled={generateMut.isPending}
            onClick={() => generateMut.mutate()}
          >
            {generateMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating (may take 1-2 min)...
              </>
            ) : (
              <>Generate Article</>
            )}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold text-sm">Article Generated</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{result.title}</p>
            <p className="text-xs text-gray-500 mt-1">Slug: {result.slug}</p>
            <p className="text-xs text-gray-500">Status: Draft (needs admin approval)</p>
            <div className="flex gap-2 mt-3">
              <Link href={`/admin/articles/${result.id}/preview`}>
                <Button size="sm" className="gap-1 text-xs">
                  <Search className="h-3 w-3" /> Preview
                </Button>
              </Link>
              <Link href="/admin/articles">
                <Button size="sm" variant="outline">View in Articles</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Use IDX40 from constants (static list for client component)
const IDX40_STOCKS = [
  { ticker: "BBCA.JK", name: "Bank Central Asia" },
  { ticker: "BBRI.JK", name: "Bank Rakyat Indonesia" },
  { ticker: "AMMN.JK", name: "Amman Mineral Internasional" },
  { ticker: "BMRI.JK", name: "Bank Mandiri (Persero)" },
  { ticker: "TLKM.JK", name: "Telkom Indonesia" },
  { ticker: "ASII.JK", name: "Astra International" },
  { ticker: "BBNI.JK", name: "Bank Negara Indonesia" },
  { ticker: "BRIS.JK", name: "Bank Syariah Indonesia" },
  { ticker: "ICBP.JK", name: "Indofood CBP Sukses Makmur" },
  { ticker: "AMRT.JK", name: "Sumber Alfaria Trijaya" },
  { ticker: "GOTO.JK", name: "Gojek Tokopedia" },
  { ticker: "UNTR.JK", name: "United Tractors" },
  { ticker: "BRPT.JK", name: "Barito Pacific" },
  { ticker: "CPIN.JK", name: "Charoen Pokphand Indonesia" },
  { ticker: "INDF.JK", name: "Indofood Sukses Makmur" },
  { ticker: "ADRO.JK", name: "Alamtri Resources Indonesia" },
  { ticker: "KLBF.JK", name: "Kalbe Farma" },
  { ticker: "ISAT.JK", name: "Indosat" },
  { ticker: "UNVR.JK", name: "Unilever Indonesia" },
  { ticker: "ANTM.JK", name: "Aneka Tambang" },
  { ticker: "PGAS.JK", name: "Perusahaan Gas Negara" },
  { ticker: "MDKA.JK", name: "Merdeka Copper Gold" },
  { ticker: "PGEO.JK", name: "Pertamina Geothermal Energy" },
  { ticker: "MBMA.JK", name: "Merdeka Battery Materials" },
  { ticker: "ADMR.JK", name: "Adaro Minerals Indonesia" },
  { ticker: "INKP.JK", name: "Indah Kiat Pulp and Paper" },
  { ticker: "INCO.JK", name: "Vale Indonesia" },
  { ticker: "PTBA.JK", name: "Bukit Asam" },
  { ticker: "EXCL.JK", name: "XL Axiata" },
  { ticker: "TOWR.JK", name: "Sarana Menara Nusa" },
  { ticker: "ITMG.JK", name: "Indo Tambangraya Megah" },
  { ticker: "JSMR.JK", name: "Jasa Marga" },
  { ticker: "ARTO.JK", name: "Bank Jago" },
  { ticker: "MEDC.JK", name: "Medco Energi International" },
  { ticker: "MAPI.JK", name: "Mitra Adiperkasa" },
  { ticker: "AKRA.JK", name: "AKR Corporindo" },
  { ticker: "MAPA.JK", name: "Map Aktif Adiperkasa" },
  { ticker: "JPFA.JK", name: "Japfa Comfeed Indonesia" },
  { ticker: "SMGR.JK", name: "Semen Indonesia" },
  { ticker: "SIDO.JK", name: "Industri Jamu and Farmasi Sido Muncul" },
];

const EDU_TOPICS = [
  { id: "cara-membaca-rsi", title: "Cara Membaca RSI" },
  { id: "memahami-macd", title: "Memahami MACD" },
  { id: "cara-menggunakan-bollinger-bands", title: "Bollinger Bands" },
  { id: "strategi-stop-loss-saham", title: "Strategi Stop Loss" },
  { id: "support-resistance-saham", title: "Support & Resistance" },
  { id: "cara-baca-chart-saham", title: "Cara Baca Chart" },
  { id: "moving-average-strategi", title: "Moving Average" },
  { id: "stochastic-oscillator", title: "Stochastic Oscillator" },
  { id: "volume-trading-analysis", title: "Analisa Volume" },
  { id: "adx-trend-strength", title: "ADX - Kekuatan Tren" },
];
