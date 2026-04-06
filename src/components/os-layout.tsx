"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface OsLayoutProps {
  children: React.ReactNode;
  cpId?: string;
  showChat?: boolean;
}

export function OsLayout({ children, cpId = "group" }: OsLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="md:ml-[56px] relative overflow-x-hidden pb-20 md:pb-0">
        <Header />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
