"use client";

/* ══════════════════════════════════════════════
   PaymentProvidersToggle — cockpit V2 modulaire
   BRIEF-16 (2026-04-25) — Phase D (T16-D1)
   Liste les 4 providers (manual/paypal/revolut/stripe) avec switch on/off.
   Stripe grisé si allowStripe=false (env ALLOW_STRIPE!=true côté serveur).
   Confirm dialog avant désactivation (impact paiements en cours).
   ══════════════════════════════════════════════ */

import { useState } from "react";
import {
  CreditCard,
  Banknote,
  Wallet,
  AlertTriangle,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import {
  usePaymentProviders,
  type PaymentProviderUi,
} from "@/hooks/use-payment-providers";

interface Props {
  /** model slug ou mN id (source des toggles globaux V1) */
  model: string;
  /** true si ALLOW_STRIPE=true côté env serveur (SSR prop) */
  allowStripe: boolean;
}

/**
 * Visuel par provider : icône + couleur accent.
 */
const PROVIDER_VISUALS: Record<
  string,
  { icon: typeof CreditCard; color: string }
> = {
  manual: { icon: Banknote, color: "#10B981" },
  paypal: { icon: Wallet, color: "#0070BA" },
  revolut: { icon: CreditCard, color: "#0666EB" },
  stripe: { icon: CreditCard, color: "#635BFF" },
};

function ProviderRow({
  provider,
  allowStripe,
  onToggle,
  saving,
  justSaved,
  justError,
}: {
  provider: PaymentProviderUi;
  allowStripe: boolean;
  onToggle: (next: boolean) => void;
  saving: boolean;
  justSaved: boolean;
  justError: string | null;
}) {
  const visual = PROVIDER_VISUALS[provider.id] || {
    icon: CreditCard,
    color: "#A882FF",
  };
  const Icon = visual.icon;

  const stripeLocked = provider.id === "stripe" && !allowStripe;
  const effectiveLocked = provider.locked || stripeLocked;
  const enabled = provider.enabled && !effectiveLocked;

  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        effectiveLocked || saving
          ? "cursor-not-allowed"
          : "cursor-pointer hover:scale-[1.005]"
      }`}
      style={{
        background: enabled ? `${visual.color}10` : "var(--bg3)",
        border: `1px solid ${enabled ? `${visual.color}30` : "var(--border2)"}`,
        opacity: effectiveLocked ? 0.55 : 1,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: enabled ? `${visual.color}20` : "var(--bg)",
          color: enabled ? visual.color : "var(--text-muted)",
        }}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-sm font-semibold"
            style={{ color: enabled ? visual.color : "var(--text)" }}
          >
            {provider.displayName}
          </p>
          {provider.mode && (
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg)",
                color: "var(--text-muted)",
                border: "1px solid var(--border2)",
              }}
            >
              {provider.mode}
            </span>
          )}
          {effectiveLocked && (
            <span
              className="text-[10px] uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ background: "#EF444420", color: "#EF4444" }}
            >
              <Lock className="w-3 h-3" /> locked
            </span>
          )}
        </div>
        <p
          className="text-[11px] mt-0.5 truncate"
          style={{ color: "var(--text-muted)" }}
        >
          {effectiveLocked
            ? provider.lockedReason ||
              "Provider verrouillé au niveau serveur (ALLOW_STRIPE≠true)"
            : enabled
              ? "Actif — les fans peuvent payer via ce provider"
              : "Désactivé"}
        </p>
        {justError && (
          <p
            className="text-[11px] mt-0.5 flex items-center gap-1"
            style={{ color: "#EF4444" }}
          >
            <AlertTriangle className="w-3 h-3" /> {justError}
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {saving && (
          <Loader2
            className="w-3.5 h-3.5 animate-spin"
            style={{ color: visual.color }}
          />
        )}
        {justSaved && !saving && (
          <Check className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
        )}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={effectiveLocked || saving}
          onClick={(e) => {
            e.preventDefault();
            if (effectiveLocked || saving) return;
            onToggle(!enabled);
          }}
          className="relative inline-flex shrink-0 items-center rounded-full transition-colors"
          style={{
            width: 36,
            height: 20,
            background: enabled ? visual.color : "var(--border2)",
            opacity: effectiveLocked ? 0.5 : 1,
          }}
        >
          <span
            className="inline-block rounded-full bg-white transition-transform"
            style={{
              width: 14,
              height: 14,
              transform: enabled ? "translateX(18px)" : "translateX(4px)",
            }}
          />
        </button>
      </div>
    </label>
  );
}

export function PaymentProvidersToggle({ model, allowStripe }: Props) {
  const { providers, loading, error, toggle } = usePaymentProviders(model);
  const [saving, setSaving] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});
  const [confirmDisable, setConfirmDisable] = useState<PaymentProviderUi | null>(
    null,
  );

  const doToggle = async (provider: PaymentProviderUi, next: boolean) => {
    setSaving(provider.id);
    setRowErrors((prev) => ({ ...prev, [provider.id]: null }));
    try {
      await toggle(provider.id, next);
      setJustSaved(provider.id);
      setTimeout(() => setJustSaved(null), 1500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors du toggle";
      setRowErrors((prev) => ({ ...prev, [provider.id]: msg }));
    } finally {
      setSaving(null);
    }
  };

  const requestToggle = (provider: PaymentProviderUi, next: boolean) => {
    // Confirm dialog si on désactive un provider actuellement actif
    if (!next && provider.enabled) {
      setConfirmDisable(provider);
      return;
    }
    void doToggle(provider, next);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text)" }}
        >
          Payment Providers
        </h3>
        <p
          className="text-[11px] uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Activer / désactiver les moyens de paiement disponibles aux fans
        </p>
      </div>

      {loading && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: "var(--bg3)", color: "var(--text-muted)" }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Chargement…</span>
        </div>
      )}

      {error && !loading && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: "#EF444410", color: "#EF4444" }}
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-2">
          {providers.map((p) => (
            <ProviderRow
              key={p.id}
              provider={p}
              allowStripe={allowStripe}
              onToggle={(next) => requestToggle(p, next)}
              saving={saving === p.id}
              justSaved={justSaved === p.id}
              justError={rowErrors[p.id] || null}
            />
          ))}
        </div>
      )}

      {confirmDisable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setConfirmDisable(null)}
        >
          <div
            className="max-w-sm w-full rounded-xl p-5 space-y-3"
            style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "#F59E0B" }} />
              <h4
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                Désactiver {confirmDisable.displayName} ?
              </h4>
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Les fans ne pourront plus choisir ce provider pour nouveaux achats.
              Les paiements en cours ne seront pas impactés — ils continuent leur
              cycle webhook normal.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDisable(null)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: "var(--bg3)",
                  color: "var(--text)",
                  border: "1px solid var(--border2)",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = confirmDisable;
                  setConfirmDisable(null);
                  void doToggle(p, false);
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: "#EF4444", color: "white" }}
              >
                Désactiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
