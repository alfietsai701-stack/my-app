import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// next/font 自動自託管字型，消除外部 Google Fonts 請求（render-blocking）。
// 中文字型是可變字型，瀏覽器依 unicode-range 只下載用到的分片。
const notoSans = Noto_Sans_TC({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-tc",
});

// 標題用襯線體
const notoSerif = Noto_Serif_TC({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-serif-tc",
  preload: false,
});

// 數字（時間、價格、統計）專用
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Ada 慢療室",
  description: "Ada 慢療室 預約與店務管理",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-TW"
      className={`h-full light ${notoSans.variable} ${notoSerif.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
