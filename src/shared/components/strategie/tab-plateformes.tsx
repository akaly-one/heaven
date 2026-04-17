"use client";

import {
  CheckCircle, ChevronDown, ChevronUp,
  Shield, AlertTriangle,
} from "lucide-react";
import { PLATFORMS, type PlatformDetail } from "@/constants/strategie-platforms";
import { REVENUE_MODELS, checkIcon } from "@/constants/strategie-revenue";

// ── Props ──

interface TabPlateformesProps {
  expandedPlatform: string | null;
  setExpandedPlatform: (id: string | null) => void;
}

// ── Component ──

export function TabPlateformes({ expandedPlatform, setExpandedPlatform }: TabPlateformesProps) {
  return (
    <div className="space-y-3">
      {/* Revenue model comparison table */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Comparatif sources de revenus
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" style={{ minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Plateforme", "Sub", "PPV", "Tips", "Live", "Cadeaux", "Custom", "IA"].map(h => (
                  <th key={h} className="px-3 py-2 text-center font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REVENUE_MODELS.map((r, i) => (
                <tr key={r.platform} style={{ borderBottom: i < REVENUE_MODELS.length - 1 ? "1px solid var(--border)" : undefined }}>
                  <td className="px-3 py-2 font-bold text-left" style={{ color: "var(--text)" }}>{r.platform}</td>
                  <td className="px-3 py-2">{checkIcon(r.sub)}</td>
                  <td className="px-3 py-2">{checkIcon(r.ppv)}</td>
                  <td className="px-3 py-2">{checkIcon(r.tips)}</td>
                  <td className="px-3 py-2">{checkIcon(r.live)}</td>
                  <td className="px-3 py-2">{checkIcon(r.gifts)}</td>
                  <td className="px-3 py-2">{checkIcon(r.custom)}</td>
                  <td className="px-3 py-2">{checkIcon(r.ai)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform cards */}
      {PLATFORMS.map(p => {
        const isExpanded = expandedPlatform === p.id;
        return (
          <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: `1px solid ${p.color}20` }}>
            <button onClick={() => setExpandedPlatform(isExpanded ? null : p.id)}
              className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: `${p.color}20`, color: p.color }}>
                {p.logo}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{p.name}</span>
                  {p.aiChat && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "#10B98115", color: "#10B981" }}>IA</span>
                  )}
                  {p.sfw && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--bg2, #1a1a1a)", color: "var(--text-muted)" }}>SFW</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  <span>Commission: {p.commission}</span>
                  <span>{p.automationLevel}</span>
                  <span style={{ color: "#10B981" }}>{p.monthlyPotential}/mois</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4" style={{ borderTop: `1px solid ${p.color}10` }}>
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>Fonctionnalites</p>
                      <div className="flex flex-wrap gap-1">
                        {p.features.map(f => (
                          <span key={f} className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: `${p.color}12`, color: p.color }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#10B981" }}>Avantages</p>
                      <ul className="space-y-0.5">
                        {p.pros.map(pro => (
                          <li key={pro} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                            <CheckCircle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#F59E0B" }}>Inconvenients</p>
                      <ul className="space-y-0.5">
                        {p.cons.map(con => (
                          <li key={con} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg" style={{ background: "var(--bg2, #1a1a1a)" }}>
                        <p className="text-[11px] font-bold uppercase mb-0.5" style={{ color: "var(--text-muted)" }}>Audience</p>
                        <p className="text-[11px] font-medium" style={{ color: "var(--text)" }}>{p.audience}</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ background: "var(--bg2, #1a1a1a)" }}>
                        <p className="text-[11px] font-bold uppercase mb-0.5" style={{ color: "var(--text-muted)" }}>Paiement min.</p>
                        <p className="text-[11px] font-medium" style={{ color: "var(--text)" }}>{p.minPayout}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Prerequis</p>
                      <ul className="space-y-0.5">
                        {p.requirements.map(r => (
                          <li key={r} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                            <Shield className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#E84393" }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>Etapes d'activation</p>
                      <ol className="space-y-0.5">
                        {p.onboarding.map((step, i) => (
                          <li key={step} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                            <span className="font-bold shrink-0" style={{ color: p.color }}>{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
