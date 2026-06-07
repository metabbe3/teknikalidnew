"use client";

import { useState, useEffect } from "react";

export default function PaymentTestPage() {
  const [loading, setLoading] = useState(false);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [testUserId] = useState(`test-${Date.now()}`);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    // Load Snap.js
    const script = document.createElement("script");
    script.src = "https://app.midtrans.com/snap/snap.js";
    script.setAttribute(
      "data-client-key",
      "Mid-client-5i5MHwgs-A3nPGvT"
    );
    script.async = true;
    script.onload = () => {
      setSnapLoaded(true);
      addLog("✅ Snap.js loaded (Production)");
    };
    script.onerror = () => addLog("❌ Snap.js failed to load");
    document.body.appendChild(script);
  }, []);

  const handleTestPay = async () => {
    setLoading(true);
    addLog("🔄 Creating test transaction Rp 1.000...");

    try {
      const res = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "test",
          userId: testUserId,
          userEmail: "test@teknikal.id",
          userName: "Test User",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addLog(`❌ Error: ${data.error} — ${data.detail || ""}`);
        setLoading(false);
        return;
      }

      addLog(`✅ Token: ${data.token}`);
      addLog(`✅ Order ID: ${data.order_id}`);
      setToken(data.token);

      // Open Snap popup
      const snap = (window as any).snap;
      if (snap) {
        addLog("🔄 Opening Snap payment popup...");
        snap.pay(data.token, {
          onSuccess: (result: any) => {
            addLog(`🎉 PAYMENT SUCCESS!`);
            addLog(`  Order: ${result.order_id}`);
            addLog(`  Status: ${result.transaction_status}`);
            addLog(`  Payment: ${result.payment_type}`);
            addLog(`  Amount: ${result.gross_amount}`);
            setLoading(false);
          },
          onPending: (result: any) => {
            addLog(`⏳ PAYMENT PENDING`);
            addLog(`  Order: ${result.order_id}`);
            addLog(`  Status: ${result.transaction_status}`);
            addLog(`  Payment: ${result.payment_type}`);
            setLoading(false);
          },
          onError: (result: any) => {
            addLog(`❌ PAYMENT ERROR: ${result.status_message}`);
            setLoading(false);
          },
          onClose: () => {
            addLog("⚠️ Payment popup closed by user");
            setLoading(false);
          },
        });
      } else {
        addLog("❌ Snap.js not available");
        setLoading(false);
      }
    } catch (err: any) {
      addLog(`❌ Exception: ${err.message}`);
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!token) return;
    addLog("🔄 Checking transaction status via Core API...");
    try {
      const res = await fetch(`/api/payment/status?order_id=latest&user_id=${testUserId}`);
      const data = await res.json();
      addLog(`📊 Status: ${JSON.stringify(data)}`);
    } catch (err: any) {
      addLog(`❌ Status check failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🧪 Midtrans Payment Test
          </h1>
          <p className="text-gray-500 mb-6">
            Production mode — Rp 1.000 test payment
          </p>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 font-medium mb-2">Test Details:</p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Merchant: <code>G645564682</code></p>
              <p>• Amount: <strong>Rp 1.000</strong></p>
              <p>• Mode: <strong>Production</strong></p>
              <p>• Test User: <code>{testUserId}</code></p>
              <p>• Snap URL: <code>app.midtrans.com</code> (production)</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleTestPay}
              disabled={loading || !snapLoaded}
              className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "⏳ Processing..." : "💳 Bayar Rp 1.000 (Test)"}
            </button>

            <button
              onClick={checkStatus}
              disabled={!token}
              className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📊 Check Transaction Status
            </button>
          </div>

          {/* Status indicators */}
          <div className="flex gap-4 mb-6">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              snapLoaded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              Snap.js: {snapLoaded ? "✅ Loaded" : "⏳ Loading..."}
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Mode: Production
            </div>
          </div>

          {/* Log */}
          <div className="bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto">
            <p className="text-gray-400 text-xs font-mono mb-2">--- Event Log ---</p>
            {log.length === 0 ? (
              <p className="text-gray-600 text-xs font-mono">Waiting for action...</p>
            ) : (
              log.map((entry, i) => (
                <p key={i} className="text-green-400 text-xs font-mono leading-relaxed">
                  {entry}
                </p>
              ))
            )}
          </div>

          {/* Steps */}
          <div className="mt-6 border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Expected Flow:</p>
            <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
              <li>Click "Bayar Rp 1.000" → Snap popup muncul</li>
              <li>Pilih metode pembayaran (GoPay/QRIS/dll)</li>
              <li>Bayar Rp 1.000</li>
              <li>Webhook notification → server update DB</li>
              <li>Log shows "PAYMENT SUCCESS"</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
