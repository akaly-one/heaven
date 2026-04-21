"use client";

/**
 * DmcaStateMachine — visualisation des 4 états du dossier DMCA
 *   pending → documents_collected → submitted_dmca → validated (ou rejected)
 *
 * Agent 7.B — Heaven / Phase 7
 */

import { CheckCircle2, Circle, FileCheck, Send, ShieldCheck, AlertOctagon } from "lucide-react";

export type DmcaStatus =
  | "pending"
  | "documents_collected"
  | "submitted_dmca"
  | "validated"
  | "rejected";

interface Props {
  status: DmcaStatus;
  submittedAt?: string | null;
  validatedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

interface Step {
  id: DmcaStatus;
  label: string;
  icon: typeof Circle;
  description: string;
}

const STEPS: Step[] = [
  { id: "pending", label: "En attente", icon: Circle, description: "Dossier à constituer" },
  { id: "documents_collected", label: "Documents reçus", icon: FileCheck, description: "5 pièces complètes" },
  { id: "submitted_dmca", label: "Envoyé à DMCA", icon: Send, description: "En attente validation Fanvue" },
  { id: "validated", label: "Validé", icon: ShieldCheck, description: "Protection DMCA active" },
];

function formatTs(ts?: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function stepReached(target: DmcaStatus, current: DmcaStatus): boolean {
  if (current === "rejected") {
    // Rejected only reaches submitted
    const order: DmcaStatus[] = ["pending", "documents_collected", "submitted_dmca"];
    return order.indexOf(target) <= order.indexOf("submitted_dmca");
  }
  const order: DmcaStatus[] = ["pending", "documents_collected", "submitted_dmca", "validated"];
  return order.indexOf(target) <= order.indexOf(current);
}

function stepActive(target: DmcaStatus, current: DmcaStatus): boolean {
  if (current === "rejected") return target === "submitted_dmca";
  return target === current;
}

export function DmcaStateMachine({
  status,
  submittedAt,
  validatedAt,
  rejectedAt,
  rejectionReason,
}: Props) {
  const isRejected = status === "rejected";

  return (
    <div className="glass rounded-xl p-5 fade-up">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
        État du dossier
      </h3>

      {/* Horizontal stepper */}
      <div className="flex items-start justify-between gap-2">
        {STEPS.map((step, idx) => {
          const reached = stepReached(step.id, status);
          const active = stepActive(step.id, status);
          const Icon = reached ? CheckCircle2 : step.icon;
          const tsForStep =
            step.id === "submitted_dmca"
              ? submittedAt
              : step.id === "validated"
              ? validatedAt
              : null;

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center text-center min-w-0">
              <div className="relative w-full flex items-center justify-center">
                {/* Connector left (not for first) */}
                {idx > 0 && (
                  <div
                    className="absolute left-0 top-4 w-1/2 h-px"
                    style={{
                      background: stepReached(STEPS[idx - 1].id, status)
                        ? "var(--accent, #c4fd50)"
                        : "var(--border, #ffffff22)",
                    }}
                  />
                )}
                {/* Connector right (not for last) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="absolute right-0 top-4 w-1/2 h-px"
                    style={{
                      background: reached
                        ? "var(--accent, #c4fd50)"
                        : "var(--border, #ffffff22)",
                    }}
                  />
                )}
                {/* Circle */}
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                    active ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{
                    background: reached ? "var(--accent, #c4fd50)" : "var(--surface-2, #ffffff0d)",
                    color: reached ? "var(--bg, #000)" : "var(--text-muted)",
                    // @ts-expect-error css var typing
                    "--tw-ring-color": active ? "var(--accent, #c4fd50)" : "transparent",
                    "--tw-ring-offset-color": "var(--bg)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-[11px] font-medium" style={{ color: reached ? "var(--text)" : "var(--text-muted)" }}>
                {step.label}
              </div>
              <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>
                {step.description}
              </div>
              {tsForStep && (
                <div className="text-[10px] mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
                  {formatTs(tsForStep)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rejected banner */}
      {isRejected && (
        <div
          className="mt-5 p-3 rounded-lg flex items-start gap-2"
          style={{ background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.3)" }}
        >
          <AlertOctagon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#fca5a5" }} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold" style={{ color: "#fecaca" }}>
              Dossier rejeté {rejectedAt ? `le ${formatTs(rejectedAt)}` : ""}
            </div>
            {rejectionReason && (
              <div className="text-[11px] mt-1" style={{ color: "#fecaca" }}>
                Motif : {rejectionReason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
