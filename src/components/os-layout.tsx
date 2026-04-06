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
      <div className="fixed top-0 right-0 left-0 md:left-[56px] z-40">
        <Header />
      </div>
      <main className="md:ml-[56px] relative overflow-x-hidden pt-12 pb-20 md:pb-0">
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
