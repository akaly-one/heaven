import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/auth-guard";
import { ModelProvider } from "@/lib/model-context";
import { ToastProvider } from "@/components/ui/toast";

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Heaven Studio",
  description: "Heaven Studio — Private platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased min-h-screen">
        <AuthGuard>
          <ModelProvider>
            <ToastProvider>{children}</ToastProvider>
          </ModelProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
