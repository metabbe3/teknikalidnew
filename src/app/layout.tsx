import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import "@/lib/events-init";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: { default: "TeknikalID — Analisa Teknikal Saham BEI", template: "%s | TeknikalID" },
  description:
    "Platform analisa teknikal saham BEI terlengkap. Chart real-time, indikator RSI, MACD, Bollinger Bands, SMA/EMA, dan screener untuk 40+ saham LQ45.",
  keywords: [
    "analisa teknikal",
    "analisa saham",
    "chart saham",
    "grafik saham",
    "indikator saham",
    "RSI saham",
    "MACD saham",
    "screener saham",
    "LQ45",
    "saham BEI",
    "harga saham",
    "trading saham",
    "candlestick saham",
    "support resistance",
    "TeknikalID",
  ],
  authors: [{ name: "TeknikalID" }],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: "TeknikalID",
    title: "TeknikalID — Analisa Teknikal Saham BEI",
    description: "Platform analisa teknikal saham BEI terlengkap. Chart real-time, indikator RSI, MACD, dan screener untuk 40+ saham LQ45.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TeknikalID — Analisa Teknikal Saham BEI",
    description: "Platform analisa teknikal saham BEI terlengkap. Chart real-time, indikator RSI, MACD, dan screener untuk 40+ saham LQ45.",
  },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="id" className={cn("h-full", "antialiased", jakarta.variable, geistMono.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-text-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm"
        >
          Skip to content
        </a>
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>
              <TooltipProvider>
                <main id="main-content" className="flex-1 flex flex-col">{children}</main>
              </TooltipProvider>
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
          />
        )}
      </body>
    </html>
  );
}
