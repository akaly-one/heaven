"use client";

/**
 * DmcaEmailGenerator — bouton 'Envoyer à DMCA@fanvue.com' + copie presse-papier
 *
 * Agent 7.B — Heaven / Phase 7
 */

import { useMemo, useState } from "react";
import { Mail, Copy, Check, ExternalLink } from "lucide-react";

interface Props {
  modelSlug: string;           // alias UI uniquement (pas de vrai prénom)
  agencyUsername?: string;     // par défaut 'yumiclub'
  to?: string;                 // par défaut DMCA@fanvue.com
}

export function DmcaEmailGenerator({ modelSlug, agencyUsername = "yumiclub", to = "DMCA@fanvue.com" }: Props) {
  const [copied, setCopied] = useState(false);

  const subject = useMemo(
    () => `Model Release Form — Yumi Club — ${modelSlug}`,
    [modelSlug]
  );

  const body = useMemo(
    () => `Hello Fanvue DMCA team,

We are submitting the Release Form documentation for model [${modelSlug}] for the account @${agencyUsername}.

Attached documents:
- Signed Release Form
- ID (recto/verso)
- Dated headshot with username "${agencyUsername}"
- Full body shot (unretouched)

Please validate at your earliest convenience.

Best regards,
Yumi Club Team`,
    [modelSlug, agencyUsername]
  );

  const mailto = useMemo(
    () => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    [to, subject, body]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* browser blocked — fallback would go here */
    }
  };

  return (
    <div className="glass rounded-xl p-5 fade-up-1 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Email DMCA
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Destinataire : <span className="font-mono">{to}</span>
          </p>
        </div>
      </div>

      <div
        className="p-3 rounded-lg text-[11px] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto"
        style={{ background: "var(--surface-2, #ffffff08)", color: "var(--text-muted)" }}
      >
        <div className="font-sans mb-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Sujet
        </div>
        <div className="mb-3 text-[11px] font-sans" style={{ color: "var(--text)" }}>
          {subject}
        </div>
        <div className="font-sans mb-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Corps
        </div>
        {body}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={mailto}
          className="btn-primary inline-flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg font-medium transition-all"
          style={{
            background: "var(--accent, #c4fd50)",
            color: "var(--bg, #000)",
          }}
        >
          <Mail className="w-3.5 h-3.5" />
          Ouvrir dans mon client email
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg font-medium transition-all glass-hover"
          style={{ color: "var(--text)" }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copié" : "Copier le corps"}
        </button>
      </div>
    </div>
  );
}
