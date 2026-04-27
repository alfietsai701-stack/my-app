import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ada 慢療室",
  description: "管理後台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
