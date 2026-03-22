"use client";

import { Sidebar } from "./sidebar";
import { ChatWidget } from "./chat-widget";

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
        {/* Animated gradient mesh background */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: `
            radial-gradient(ellipse 700px 500px at 10% 15%, rgba(201,168,76,0.07), transparent),
            radial-gradient(ellipse 600px 600px at 85% 75%, rgba(91,141,239,0.05), transparent),
            radial-gradient(ellipse 500px 400px at 50% 50%, rgba(167,139,250,0.04), transparent),
            radial-gradient(ellipse 300px 300px at 70% 20%, rgba(0,214,143,0.03), transparent)
          `,
        }} />
        {/* Dot grid */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{
          backgroundImage: "radial-gradient(rgba(201,168,76,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        {/* Floating orbs */}
        <div className="fixed pointer-events-none z-0" style={{
          width: 400, height: 400, borderRadius: "50%", top: "10%", right: "5%",
          background: "radial-gradient(circle, rgba(201,168,76,0.06), transparent 70%)",
          filter: "blur(40px)",
          animation: "floatOrb1 20s ease-in-out infinite alternate",
        }} />
        <div className="fixed pointer-events-none z-0" style={{
          width: 350, height: 350, borderRadius: "50%", bottom: "15%", left: "10%",
          background: "radial-gradient(circle, rgba(91,141,239,0.05), transparent 70%)",
          filter: "blur(50px)",
          animation: "floatOrb2 18s ease-in-out infinite alternate",
        }} />
        <style>{`
          @keyframes floatOrb1 {
            0%   { transform: translate(0, 0) scale(1); }
            33%  { transform: translate(-60px, 40px) scale(1.15); }
            66%  { transform: translate(40px, -30px) scale(0.9); }
            100% { transform: translate(-30px, 50px) scale(1.05); }
          }
          @keyframes floatOrb2 {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(50px, -40px) scale(1.1); }
            100% { transform: translate(-40px, 30px) scale(0.95); }
          }
          @keyframes cardEnter {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .anim-1 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
          .anim-2 { animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
          .anim-3 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
          .anim-4 { animation: cardEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both; }
          .anim-5 { animation: cardEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both; }
          .anim-6 { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both; }
          .sq-glass {
            background: rgba(12, 12, 20, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .sq-card {
            background: linear-gradient(135deg, #0C0C14, rgba(6,6,11,0.95));
            border: 1px solid var(--sq-border);
          }
          .sq-card-hover {
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .sq-card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 48px rgba(201,168,76,0.08), 0 0 1px rgba(255,255,255,0.05);
          }
        `}</style>
        <div className="relative z-10">
          {children}
        </div>
      </main>
      {showChat && <ChatWidget cpId={cpId} mode="pilot" position="bottom-right" />}
    </div>
  );
}
