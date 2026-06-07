"use client";

import { useState, useEffect } from "react";
import { PREMIUM_PLANS, getClientKey, getSnapUrl } from "@/lib/midtrans";

interface PaymentButtonProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  planId?: string; // if not provided, shows plan selection
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export default function PaymentButton({
  userId,
  userEmail,
  userName,
  planId: selectedPlanId,
  onSuccess,
  onError,
  onClose,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(selectedPlanId || "");
  const [snapLoaded, setSnapLoaded] = useState(false);

  // Load Snap.js script
  useEffect(() => {
    const existingScript = document.querySelector(
      `script[src="${getSnapUrl()}"]`
    );
    if (existingScript) {
      setSnapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = getSnapUrl();
    script.setAttribute("data-client-key", getClientKey());
    script.async = true;
    script.onload = () => setSnapLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handlePay = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      // Create transaction via API
      const res = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          userId,
          userEmail,
          userName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError?.(data.error || "Failed to create transaction");
        setLoading(false);
        return;
      }

      // Open Snap payment popup
      if (snapLoaded && (window as any).snap) {
        (window as any).snap.pay(data.token, {
          onSuccess: (result: any) => {
            onSuccess?.(result.order_id);
            setLoading(false);
          },
          onPending: (result: any) => {
            onSuccess?.(result.order_id); // Still treat as success flow
            setLoading(false);
          },
          onError: (result: any) => {
            onError?.(result.status_message || "Payment error");
            setLoading(false);
          },
          onClose: () => {
            onClose?.();
            setLoading(false);
          },
        });
      } else {
        // Fallback: redirect to payment page
        window.location.href = data.redirect_url;
      }
    } catch (error: any) {
      onError?.(error.message || "Something went wrong");
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  // If planId is pre-selected, show single button
  if (selectedPlanId) {
    const plan = PREMIUM_PLANS.find((p) => p.id === selectedPlanId);
    return (
      <button
        onClick={handlePay}
        disabled={loading || !snapLoaded}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Memproses..." : `Bayar ${formatCurrency(plan!.price)}`}
      </button>
    );
  }

  // Plan selection UI
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PREMIUM_PLANS.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? "border-indigo-600 bg-indigo-50 shadow-lg"
                : "border-gray-200 hover:border-indigo-300"
            }`}
          >
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold text-indigo-600 mt-2">
              {formatCurrency(plan.price)}
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 mr-2 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={handlePay}
        disabled={!selectedPlan || loading || !snapLoaded}
        className="w-full px-6 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Memproses..." : "Bayar Sekarang"}
      </button>
    </div>
  );
}
