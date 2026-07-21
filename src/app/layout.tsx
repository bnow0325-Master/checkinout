import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  applicationName: "BNOW 출퇴근",
  title: {
    default: "BNOW 출퇴근",
    template: "%s — BNOW 출퇴근",
  },
  description: "직원 출퇴근 기록 시스템 (동적 QR + GPS로 원격 출퇴근 차단)",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BNOW 출퇴근",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/checkinout-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/checkinout-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/checkinout-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <TopNav />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
