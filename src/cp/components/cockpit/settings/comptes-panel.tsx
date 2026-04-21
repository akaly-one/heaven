"use client";

// ══════════════════════════════════════════════════════════════════════════
//  ComptesPanel — Tab Comptes (Agent 10.A Phase 10)
//
//  Fusion brief B2/B3/B4 :
//    - 2 comptes tech (root + heaven) + 3 modeles (yumi/paloma/ruby)
//    - Gestion unifiee : code login masque, scopes, modules activables
//    - Skeleton uniforme pour tous les comptes
//
//  Cote UI :
//    - Admin (root/yumi) : voit tous les comptes, peut reset code/toggle modules
//    - Model (paloma/ruby) : ne voit que son propre compte (read-only via scope)
//
//  Delegation :
//    - <AccountsTable> : liste + drawer detail + reset modal
//    - <AccountModulesToggle> : checkboxes modules (via drawer)
// ══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Check, X, Zap } from "lucide-react";
import { AccountsTable } from "./accounts-table";

interface Props {
  isRoot: boolean;
  isAgencyAdmin: boolean;
  currentModelSlug: string;
  authHeaders: () => HeadersInit;
}

type Toast = { kind: "ok" | "err"; msg: string };

export function ComptesPanel({ isRoot, isAgencyAdmin, authHeaders }: Props) {
  const [toast, setToast] = useState<Toast | null>(null);

  const pushToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className="text-xs px-3 py-2 rounded flex items-center gap-2 animate-fade-in"
          style={{
            background: toast.kind === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: toast.kind === "ok" ? "#10B981" : "#EF4444",
          }}
        >
          {toast.kind === "ok" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Info fusion B2/B3/B4 */}
      <div
        className="rounded-xl p-3 text-[11px] flex items-start gap-2"
        style={{ background: "rgba(168,130,255,0.08)", border: "1px solid rgba(168,130,255,0.2)", color: "var(--text-muted)" }}
      >
        <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#A882FF" }} />
        <p>
          Gestion unifiée : comptes root/yumi/paloma/ruby, codes de connexion masqués, 5 modules activables par compte
          (Agent DM, Finance, Ops, Stratégie, DMCA).
          {isAgencyAdmin
            ? " Actions admin : reset code (one-shot), toggle modules, scopes granulaires."
            : isRoot
              ? " Admin racine : accès complet."
              : " Vous voyez uniquement votre propre compte."}
        </p>
      </div>

      {/* Table principale — toute la logique est deleguee */}
      <AccountsTable
        isAgencyAdmin={isAgencyAdmin}
        authHeaders={authHeaders}
        onToast={pushToast}
      />
    </div>
  );
}
