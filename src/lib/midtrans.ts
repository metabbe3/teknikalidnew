import Midtrans from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Snap API instance (for creating transactions)
let snap: Midtrans.Snap | null = null;

export function getSnap(): Midtrans.Snap {
  if (!snap) {
    snap = new Midtrans.Snap({
      isProduction,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.MIDTRANS_CLIENT_KEY!,
    });
  }
  return snap;
}

// Core API instance (for status checks, refunds, etc.)
let core: Midtrans.CoreApi | null = null;

export function getCoreApi(): Midtrans.CoreApi {
  if (!core) {
    core = new Midtrans.CoreApi({
      isProduction,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.MIDTRANS_CLIENT_KEY!,
    });
  }
  return core;
}

// Get the client key for frontend Snap.js
export function getClientKey(): string {
  return process.env.MIDTRANS_CLIENT_KEY || "";
}

// Get the Snap URL for frontend
export function getSnapUrl(): string {
  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

// Signature key for webhook verification
export function getSignatureKey(): string {
  return process.env.MIDTRANS_SERVER_KEY || "";
}

// Verify webhook signature
export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string
): boolean {
  const crypto = require("crypto");
  const input = orderId + statusCode + grossAmount + serverKey;
  const hash = crypto
    .createHash("sha512")
    .update(input)
    .digest("hex");
  console.log("[Midtrans] Signature check:", {
    orderId,
    statusCode,
    grossAmount,
    input,
    expectedHash: hash,
    receivedSignature: signatureKey,
    match: hash === signatureKey,
  });
  return hash === signatureKey;
}

// Transaction status types
export type MidtransTransactionStatus =
  | "capture"
  | "settlement"
  | "pending"
  | "deny"
  | "expire"
  | "cancel"
  | "refund"
  | "partial_refund"
  | "chargeback"
  | "partial_chargeback"
  | "authorize";

export interface MidtransNotification {
  transaction_time: string;
  transaction_status: MidtransTransactionStatus;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  bank?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  acquirer?: string;
  custom_field1?: string;
  custom_field2?: string;
  custom_field3?: string;
}

// Plan definitions for premium features
export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  duration: string; // e.g. "30d", "365d"
  features: string[];
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    price: 99000,
    duration: "30d",
    features: [
      "Analisa teknikal real-time",
      "Sinyal buy/sell harian",
      "Backtesting strategy",
      "Alert harga custom",
      "Tanpa iklan",
    ],
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    price: 799000,
    duration: "365d",
    features: [
      "Semua fitur Monthly",
      "Portfolio tracker lanjutan",
      "AI stock analysis",
      "Priority support",
      "Hemat ~33% dari bulanan",
    ],
  },
];
