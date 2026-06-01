"use client";

import { useState } from "react";
import { X, Link2, Check } from "lucide-react";

const SHARE_TARGETS = [
  {
    name: "WhatsApp",
    color: "bg-[#25D366]",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.258-.155-3.086.916.916-3.086-.155-.258A8 8 0 1112 20z" />
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
  },
  {
    name: "Telegram",
    color: "bg-[#0088cc]",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "X (Twitter)",
    color: "bg-black",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
];

export function ShareModal({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const postUrl = `https://teknikal.id/community/${postId}`;
  const shareText = "Cek post ini di TeknikalID";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = postUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Bagikan Post</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {SHARE_TARGETS.map((target) => (
              <button
                key={target.name}
                onClick={() => {
                  window.open(target.getUrl(postUrl, shareText), "_blank", "noopener,noreferrer,width=600,height=400");
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-10 h-10 ${target.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {target.icon}
                </div>
                <span className="text-xs font-medium text-gray-600">{target.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              readOnly
              value={postUrl}
              className="flex-1 bg-transparent text-xs text-gray-600 outline-none truncate font-mono"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                copied
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Tersalin
                </span>
              ) : (
                "Salin"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
