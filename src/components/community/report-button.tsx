"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";

interface ReportButtonProps {
  targetType: "POST" | "COMMENT";
  targetId: string;
}

const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Pelecehan" },
  { value: "MISINFORMATION", label: "Misinformasi" },
  { value: "OTHER", label: "Lainnya" },
];

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      if (!res.ok) throw new Error("Gagal melaporkan");
      return res.json();
    },
    onSuccess: () => {
      setReported(true);
      setOpen(false);
    },
  });

  const toggleMenu = useCallback(() => {
    setOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  if (reported) {
    return <span className="text-text-secondary text-xs">Terlapor</span>;
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        className="p-2.5 rounded-full text-text-secondary hover:bg-bg-hover transition-colors shrink-0"
        aria-label="Opsi lainnya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && menuPos && createPortal(
        <div
          className="fixed z-[9999] w-44 bg-bg-card rounded-xl depth-shadow-strong border border-border py-1"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <p className="px-3 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Laporkan
          </p>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.value}
              onClick={() => reportMutation.mutate(reason.value)}
              disabled={reportMutation.isPending}
              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              {reason.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
