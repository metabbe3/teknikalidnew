"use client";

import { useCreateAccount } from "@/hooks/use-paper-trading";
import { useToast } from "./toast";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const BALANCE_OPTIONS = [
  { value: 10_000_000, label: "10 Juta", desc: "Cocok untuk pemula", popular: false },
  { value: 50_000_000, label: "50 Juta", desc: "Modal menengah", popular: true },
  { value: 100_000_000, label: "100 Juta", desc: "Modal besar", popular: false },
];

export function CreateAccount() {
  const createAccount = useCreateAccount();
  const { toast } = useToast();

  const handleCreate = (amount: number) => {
    createAccount.mutate(amount, {
      onSuccess: () => toast("Akun simulasi berhasil dibuat!"),
      onError: (err) => toast((err as Error).message, "error"),
    });
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8">
      {/* Dark hero card */}
      <div className="sim-hero rounded-2xl p-6 sm:p-8 w-full max-w-sm text-center relative z-10">
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Mulai Simulasi Trading</h1>
          <p className="text-sm text-slate-400 mb-6">
            Latih strategi tanpa risiko uang asli
          </p>

          <div className="space-y-3 stagger-grid">
            {BALANCE_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => handleCreate(opt.value)}
                disabled={createAccount.isPending}
                className="press-scale w-full relative bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 hover:border-teal-500/30 transition-all duration-200 disabled:opacity-40 group"
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                {opt.popular && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                    Populer
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white font-mono">
                      {opt.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-teal-400 font-mono">
                      {formatRupiah(opt.value)}
                    </div>
                  </div>
                </div>
                {/* Accent bar */}
                <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-teal-500/40 group-hover:bg-teal-400 transition-colors" />
              </button>
            ))}
          </div>

          {createAccount.isPending && (
            <div className="mt-4 flex items-center justify-center gap-2 text-teal-400 text-sm">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Membuat akun...
            </div>
          )}

          <p className="text-[10px] text-slate-600 mt-6">
            Saldo virtual &middot; Tidak ada risiko finansial
          </p>
        </div>
      </div>
    </div>
  );
}
