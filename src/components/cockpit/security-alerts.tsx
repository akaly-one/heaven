"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Eye, Ban, MessageCircle, AlertTriangle } from "lucide-react";

interface SecurityAlert {
  id: string;
  model: string;
  client_id: string;
  client_pseudo: string;
  client_tier: string | null;
  alert_type: string;
  page: string | null;
  action_taken: string | null;
  created_at: string;
}

const TIER_HEX: Record<string, string> = {
  vip: "#F43F5E", gold: "#F59E0B", diamond: "#7C3AED", platinum: "#A78BFA",
};

interface SecurityAlertsProps {
  modelSlug: string;
  authHeaders: () => Record<string, string>;
}

export function SecurityAlerts({ modelSlug, authHeaders }: SecurityAlertsProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/security/screenshot-alert?model=${modelSlug}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAlerts(d.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [modelSlug, authHeaders]);

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const sendWarning = useCallback(async (alert: SecurityAlert) => {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: alert.model,
        client_id: alert.client_id,
        sender_type: "model",
        content: "⚠️ Screenshot activity has been detected on your account. All content is watermarked with your identity. Further violations may result in access revocation.",
      }),
    });
    // Update action
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, action_taken: "warning_sent" } : a));
  }, []);

  const revokeAccess = useCallback(async (alert: SecurityAlert) => {
    await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id: alert.client_id, is_blocked: true }),
    });
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, action_taken: "revoked" } : a));
  }, [authHeaders]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" style={{ color: "var(--success)" }} />
        </div>
        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>No security incidents</p>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Screenshot attempts will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const tierColor = TIER_HEX[alert.client_tier || ""] || "var(--text-muted)";
        return (
          <div key={alert.id} className="card-premium p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "rgba(239,68,68,0.1)" }}>
                <AlertTriangle className="w-4 h-4" style={{ color: "var(--danger)" }} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {timeAgo(alert.created_at)} ago
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: "var(--danger)" }}>
                    Screenshot detected
                  </span>
                </div>

                {/* Details */}
                <p className="text-xs mb-2" style={{ color: "var(--text)" }}>
                  Subscriber: <span className="font-semibold" style={{ color: tierColor }}>@{alert.client_pseudo}</span>
                  {alert.client_tier && (
                    <span className="badge text-[10px] ml-1.5" style={{ background: `${tierColor}15`, color: tierColor }}>
                      {alert.client_tier.toUpperCase()}
                    </span>
                  )}
                  {alert.page && (
                    <span className="text-[10px] ml-2" style={{ color: "var(--text-muted)" }}>
                      Page: {alert.page}
                    </span>
                  )}
                </p>

                {/* Actions */}
                {alert.action_taken === "revoked" ? (
                  <span className="badge badge-danger text-[10px]">Access revoked</span>
                ) : alert.action_taken === "warning_sent" ? (
                  <span className="badge badge-warning text-[10px]">Warning sent</span>
                ) : (
                  <div className="flex gap-1.5">
                    <a href={`/agence/clients`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer no-underline"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border2)" }}>
                      <Eye className="w-3 h-3" /> View
                    </a>
                    <button onClick={() => sendWarning(alert)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer"
                      style={{ background: "rgba(245,158,11,0.08)", color: "var(--tier-gold)", border: "1px solid rgba(245,158,11,0.15)" }}>
                      <MessageCircle className="w-3 h-3" /> Warn
                    </button>
                    <button onClick={() => revokeAccess(alert)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer"
                      style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.15)" }}>
                      <Ban className="w-3 h-3" /> Revoke
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Disclaimer */}
      <p className="text-[10px] text-center pt-2 px-4" style={{ color: "var(--text-muted)" }}>
        Screenshot detection reduces casual captures but cannot prevent determined users.
        The dynamic watermark is the primary protection layer.
      </p>
    </div>
  );
}
