"use client";

import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES = [
  {
    label: "Trading",
    emoji: ["📈", "📉", "🔥", "🎯", "💰", "⚡", "✅", "❌", "⚠️", "💎", "🏆", "📊"],
  },
  {
    label: "Reaksi",
    emoji: ["👍", "👎", "👏", "🙌", "💪", "🤝", "🙏", "🤔", "😮", "😂", "🤩", "😎"],
  },
  {
    label: "Umum",
    emoji: ["❤️", "💡", "🚀", "⭐", "🎉", "😱", "😍", "😤", "🥳", "😴", "🤡", "💀"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-text-secondary hover:text-amber-500 hover:bg-bg-hover transition-colors"
        title="Emoji"
        aria-label="Pilih emoji"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-20 w-72 bg-bg-card rounded-xl depth-shadow border border-border p-3">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.label} className="mb-2 last:mb-0">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{cat.label}</p>
              <div className="grid grid-cols-6 gap-0.5">
                {cat.emoji.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
