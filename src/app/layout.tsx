import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/auth-guard";

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "SQWENSY OS",
  description: "Multi-cockpit business management system — SQWENSY Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased min-h-screen">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
