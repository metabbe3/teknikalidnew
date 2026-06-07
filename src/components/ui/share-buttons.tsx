"use client";

import { useState } from "react";
import { Check, Download, Link2, Share2 } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
  /** OG image URL — when provided, shows a Story/Download button */
  imageUrl?: string;
  /** Story-format image URL (1080x1920) — used for Story download if provided */
  storyImageUrl?: string;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.258-.155-3.086.916.916-3.086-.155-.258A8 8 0 1112 20z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function ShareButtons({ url, title, text, className, imageUrl, storyImageUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [storyState, setStoryState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const shareText = text ? `${title} — ${text}` : title;

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=400"
    );
  };

  const handleTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=400"
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStoryShare = async () => {
    const fetchUrl = storyImageUrl || imageUrl;
    if (!fetchUrl || storyState === "loading") return;
    setStoryState("loading");

    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], "teknikalid-stock.png", { type: "image/png" });

      // Mobile: use Web Share API with file support (Instagram Stories, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: shareText });
          setStoryState("success");
          setTimeout(() => setStoryState("idle"), 2000);
          return;
        } catch {
          // user cancelled share dialog — fall through to download
        }
      }

      // Desktop fallback: download the image
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "teknikalid-stock.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setStoryState("success");
      setTimeout(() => setStoryState("idle"), 2000);
    } catch {
      setStoryState("error");
      setTimeout(() => setStoryState("idle"), 2000);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mr-1">Bagikan</span>

      {(imageUrl || storyImageUrl) && (
        <button
          onClick={handleStoryShare}
          disabled={storyState === "loading"}
          className={`inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-white text-xs font-semibold transition-colors press-scale focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 ${
            storyState === "error"
              ? "bg-red-500"
              : storyState === "success"
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:brightness-110"
          }`}
          aria-label="Bagikan ke Story atau Download"
        >
          {storyState === "loading" ? (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : storyState === "success" ? (
            <Check className="w-3.5 h-3.5" />
          ) : storyState === "error" ? (
            <span className="text-[10px]">Gagal</span>
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {storyState === "idle" ? "Story" : storyState === "success" ? "OK!" : ""}
        </button>
      )}

      <button
        onClick={handleWhatsApp}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] text-white hover:brightness-110 transition-colors press-scale focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500"
        aria-label="Bagikan ke WhatsApp"
      >
        <WhatsAppIcon />
      </button>

      <button
        onClick={handleX}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-colors press-scale focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500"
        aria-label="Bagikan ke X"
      >
        <XIcon />
      </button>

      <button
        onClick={handleTelegram}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0088cc] text-white hover:brightness-110 transition-colors press-scale focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500"
        aria-label="Bagikan ke Telegram"
      >
        <TelegramIcon />
      </button>

      <button
        onClick={handleCopy}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors press-scale focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 ${
          copied
            ? "bg-emerald-100 text-emerald-700"
            : "bg-bg-card text-text-tertiary border border-border hover:text-text-primary hover:bg-bg-hover"
        }`}
        aria-label="Salin tautan"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function ShareToggleButton({ url, title, text }: Omit<ShareButtonsProps, "className">) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareText = text ? `${title} — ${text}` : title;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch {
        // Fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-border transition-colors press-scale focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 ${
        copied
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-bg-card text-text-tertiary hover:text-text-primary hover:bg-bg-hover"
      }`}
      aria-label="Bagikan"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Tersalin!
        </>
      ) : (
        <>
          <Share2 className="w-3 h-3" />
          Bagikan
        </>
      )}
    </button>
  );
}
