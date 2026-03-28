"use client";

import { Sidebar } from "./sidebar";
import { PilotAssistant } from "./pilot-assistant";

interface OsLayoutProps {
  children: React.ReactNode;
  cpId?: string;
  showChat?: boolean;
}

export function OsLayout({ children, cpId = "group", showChat = true }: OsLayoutProps) {
  return (
    <div className="flex h-dvh md:h-auto md:min-h-screen overflow-hidden md:overflow-visible">
      <Sidebar />
      <main className="flex-1 md:ml-[60px] relative overflow-y-auto overflow-x-hidden">
        {/* Ambient gradient mesh */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: `
            radial-gradient(ellipse 600px 400px at 15% 10%, rgba(230,51,41,0.04), transparent),
            radial-gradient(ellipse 500px 500px at 85% 80%, rgba(244,63,94,0.03), transparent),
            radial-gradient(ellipse 400px 300px at 50% 50%, rgba(167,139,250,0.02), transparent)
          `,
        }} />
        <div className="relative z-10">
          {children}
        </div>
      </main>
      {showChat && <PilotAssistant cpId={cpId} />}
    </div>
  );
}
