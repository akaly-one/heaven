import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/auth-guard";
import { ModelProvider } from "@/lib/model-context";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/lib/posthog-init";

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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("heaven_theme");if(t){document.documentElement.setAttribute("data-theme",t)}else{var d=window.matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.setAttribute("data-theme",d?"dark":"light")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <PostHogProvider>
          <ThemeProvider />
          <AuthGuard>
            <ModelProvider>
              <ToastProvider>{children}</ToastProvider>
            </ModelProvider>
          </AuthGuard>
        </PostHogProvider>
      </body>
    </html>
  );
}
