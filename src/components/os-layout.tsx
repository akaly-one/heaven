"use client";

import { Sidebar } from "./sidebar";

interface OsLayoutProps {
  children: React.ReactNode;
  cpId?: string;
  showChat?: boolean;
}

export function OsLayout({ children, cpId = "group" }: OsLayoutProps) {
  return (
    <div className="flex min-h-screen" style={{ background: "#0a0a0a" }}>
      <Sidebar />
      <main className="flex-1 md:ml-[56px] relative overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
