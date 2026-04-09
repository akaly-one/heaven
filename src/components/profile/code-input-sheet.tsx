"use client";

import { Key } from "lucide-react";

interface CodeInputSheetProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
}

export function CodeInputSheet({ show, onClose, onSubmit }: CodeInputSheetProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full rounded-t-2xl p-5 animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Key className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Code d&apos;acces</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Entre ton code pour debloquer le contenu exclusif</p>
          </div>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
          const code = input?.value?.trim();
          if (!code) return;
          try {
            await onSubmit(code);
          } catch {
            input.placeholder = "Erreur";
            input.value = "";
          }
        }} className="flex items-center gap-2">
          <input type="text" placeholder="ENTRE TON CODE" autoFocus
            className="flex-1 px-4 py-3 rounded-xl text-sm font-mono uppercase tracking-wider outline-none text-center"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <button type="submit"
            className="px-5 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
            style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
            Valider
          </button>
        </form>
      </div>
    </div>
  );
}
