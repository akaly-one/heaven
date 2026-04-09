"use client";

import { X, ExternalLink, CheckCircle, XCircle, ShieldAlert, ShoppingBag, Check, Ban, Clock, Key, ArrowRight } from "lucide-react";

interface ClientItem {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; last_active: string | null; created_at: string;
  verified_status?: string | null; lead_source?: string | null;
}
interface CodeItem {
  code: string; client: string; tier: string; active: boolean;
  revoked: boolean; expiresAt: string;
}
interface OrderItem {
  id: string; pseudo: string; content: string; created_at: string;
}

interface ClientsDropdownProps {
  dropdownBox: string;
  dropdownStyle: React.CSSProperties;
  clients: ClientItem[];
  codes: CodeItem[];
  activeCodes: CodeItem[];
  pendingClients: ClientItem[];
  pendingOrders: OrderItem[];
  verifyingId: string | null;
  processingOrderId: string | null;
  pseudoOf: (c: ClientItem) => string;
  onVerify: (clientId: string, action: "verify" | "reject") => void;
  onAcceptOrder: (orderId: string, content: string) => void;
  onRefuseOrder: (orderId: string, content: string) => void;
  onClose: () => void;
}

export function ClientsDropdown({
  dropdownBox, dropdownStyle,
  clients, codes, activeCodes, pendingClients, pendingOrders,
  verifyingId, processingOrderId, pseudoOf,
  onVerify, onAcceptOrder, onRefuseOrder, onClose,
}: ClientsDropdownProps) {
  return (
    <div className={dropdownBox} style={dropdownStyle}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
          Clients & Codes
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {activeCodes.length} actif{activeCodes.length > 1 ? "s" : ""} / {clients.length} client{clients.length > 1 ? "s" : ""}
          </span>
          <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
            style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="max-h-[50vh] overflow-y-auto">
        {/* ── Unified Client Pipeline ── */}
        {(() => {
          // Build unified client list: pending first, then verified with orders, then active
          const ordersByPseudo = new Map<string, OrderItem>();
          pendingOrders.forEach(o => {
            const m = o.content?.match(/@(\S+)/);
            if (m) ordersByPseudo.set(m[1].toLowerCase(), o);
          });

          // Orphan orders (no matching client record)
          const matchedOrderPseudos = new Set<string>();

          // 1. Pending clients (need verification first)
          const pendingItems = pendingClients.slice(0, 10).map(c => {
            const pseudo = pseudoOf(c);
            const order = ordersByPseudo.get(pseudo.toLowerCase());
            if (order) matchedOrderPseudos.add(pseudo.toLowerCase());
            return { type: "pending" as const, client: c, pseudo, order };
          });

          // 2. Verified clients with pending orders
          const verifiedWithOrder = clients
            .filter(c => c.verified_status === "verified")
            .map(c => {
              const pseudo = pseudoOf(c);
              const order = ordersByPseudo.get(pseudo.toLowerCase());
              if (order) matchedOrderPseudos.add(pseudo.toLowerCase());
              return { type: "verified_order" as const, client: c, pseudo, order };
            })
            .filter(x => x.order);

          // 3. Orphan orders (order exists but no client match)
          const orphanOrders = pendingOrders.filter(o => {
            const m = o.content?.match(/@(\S+)/);
            return m && !matchedOrderPseudos.has(m[1].toLowerCase());
          });

          // 4. Active clients (verified, no pending order)
          const activeClients = clients
            .filter(c => c.verified_status === "verified" || (c.verified_status && c.verified_status !== "pending" && c.verified_status !== "rejected"))
            .filter(c => !ordersByPseudo.has(pseudoOf(c).toLowerCase()))
            .slice(0, 15);

          const hasActions = pendingItems.length > 0 || verifiedWithOrder.length > 0 || orphanOrders.length > 0;

          return (<>
            {/* ── Section: Actions requises ── */}
            {hasActions && (
              <div className="flex items-center gap-1.5 px-4 py-2" style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid var(--border)" }}>
                <ShieldAlert className="w-3 h-3" style={{ color: "#F59E0B" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#F59E0B" }}>
                  Actions requises ({pendingItems.length + verifiedWithOrder.length + orphanOrders.length})
                </span>
              </div>
            )}

            {/* Pending clients — Step 1: verify profile */}
            {pendingItems.map(({ client: c, pseudo, order }) => {
              const isSnap = !!c.pseudo_snap;
              const profileUrl = isSnap
                ? `https://snapchat.com/add/${c.pseudo_snap}`
                : c.pseudo_insta ? `https://instagram.com/${c.pseudo_insta}` : null;
              const platformLabel = isSnap ? "Snapchat" : "Instagram";
              const pColor = isSnap ? "#C4A600" : "#C13584";
              const isProcessing = verifyingId === c.id;

              // Parse order info if exists
              const orderAmount = order?.content?.match(/\((\d+)€\)/)?.[1];
              const orderItem = order?.content?.match(/commande:\s*(.+?)\s*\(/)?.[1]?.trim();
              const orderPayment = order?.content?.match(/via\s+(\w+)/i)?.[1];

              return (
                <div key={`pipe-${c.id}`} className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Client header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: `${pColor}20`, color: pColor }}>
                      {pseudo.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold truncate block" style={{ color: "var(--text)" }}>@{pseudo}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {c.lead_source ? `via ${c.lead_source}` : platformLabel} · {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>

                  {/* Step 1: Verify profile */}
                  <div className="ml-4 pl-4 space-y-2" style={{ borderLeft: "2px solid #F59E0B" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase" style={{ color: "#F59E0B" }}>Etape 1</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Verifier le profil</span>
                    </div>
                    {profileUrl && (
                      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-bold no-underline transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: `${pColor}10`, color: pColor, border: `1px solid ${pColor}30` }}>
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ouvrir {platformLabel}
                        <span className="text-[10px] font-normal ml-auto" style={{ opacity: 0.6 }}>@{pseudo}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => onVerify(c.id, "verify")} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", opacity: isProcessing ? 0.5 : 1 }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Profil OK
                      </button>
                      <button onClick={() => onVerify(c.id, "reject")} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", opacity: isProcessing ? 0.5 : 1 }}>
                        <XCircle className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    </div>

                    {/* Step 2 preview: order waiting (greyed out until verified) */}
                    {order && (
                      <div className="mt-2 opacity-40">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold uppercase" style={{ color: "#A855F7" }}>Etape 2</span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Confirmer paiement</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.1)" }}>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{orderItem || "Pack"}</span>
                          {orderAmount && <span className="text-[10px] font-bold" style={{ color: "#10B981" }}>{orderAmount}€</span>}
                          {orderPayment && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}>via {orderPayment}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Verified clients with pending orders — Step 2: confirm payment */}
            {verifiedWithOrder.map(({ client: c, pseudo, order }) => {
              if (!order) return null;
              const isSnap = !!c.pseudo_snap;
              const pColor = isSnap ? "#C4A600" : "#C13584";
              const profileUrl = isSnap
                ? `https://snapchat.com/add/${c.pseudo_snap}`
                : c.pseudo_insta ? `https://instagram.com/${c.pseudo_insta}` : null;
              const orderAmount = order.content?.match(/\((\d+)€\)/)?.[1];
              const orderItem = order.content?.match(/commande:\s*(.+?)\s*\(/)?.[1]?.trim();
              const orderPayment = order.content?.match(/via\s+(\w+)/i)?.[1];
              const orderDesc = order.content?.match(/📝\s*"(.+?)"/)?.[1];
              const isProcessing = processingOrderId === order.id;

              return (
                <div key={`pipe-order-${c.id}`} className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    {profileUrl ? (
                      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 no-underline transition-all hover:scale-110"
                        style={{ background: `${pColor}20`, color: pColor }}>
                        {pseudo.charAt(0).toUpperCase()}
                      </a>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: `${pColor}20`, color: pColor }}>
                        {pseudo.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>@{pseudo}</span>
                        <CheckCircle className="w-3 h-3 shrink-0" style={{ color: "#10B981" }} />
                      </div>
                      <span className="text-[10px]" style={{ color: "#10B981" }}>Profil verifie</span>
                    </div>
                  </div>

                  <div className="ml-4 pl-4 space-y-2" style={{ borderLeft: "2px solid #A855F7" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase" style={{ color: "#A855F7" }}>Confirmer paiement</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" style={{ color: "#A855F7" }} />
                      <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{orderItem || "Pack"}</span>
                      {orderAmount && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md ml-auto" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                          {orderAmount}€
                        </span>
                      )}
                    </div>
                    {orderPayment && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Methode :</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: orderPayment.toLowerCase() === "paypal" ? "rgba(0,123,255,0.1)" : "rgba(0,41,107,0.1)",
                          color: orderPayment.toLowerCase() === "paypal" ? "#007BFF" : "#00296B",
                        }}>{orderPayment}</span>
                      </div>
                    )}
                    {orderDesc && (
                      <p className="text-[10px] leading-snug px-2.5 py-1.5 rounded-md" style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-muted)" }}>
                        &ldquo;{orderDesc}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => onAcceptOrder(order.id, order.content || "")} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", opacity: isProcessing ? 0.5 : 1 }}>
                        <Check className="w-3.5 h-3.5" /> Valider paiement
                      </button>
                      <button onClick={() => onRefuseOrder(order.id, order.content || "")} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", opacity: isProcessing ? 0.5 : 1 }}>
                        <Ban className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Orphan orders (no client record yet) */}
            {orphanOrders.map(order => {
              const pseudoMatch = order.content?.match(/@(\S+)/);
              const pseudo = pseudoMatch?.[1] || "?";
              const orderAmount = order.content?.match(/\((\d+)€\)/)?.[1];
              const orderItem = order.content?.match(/commande:\s*(.+?)\s*\(/)?.[1]?.trim();
              const orderPayment = order.content?.match(/via\s+(\w+)/i)?.[1];
              const isProcessing = processingOrderId === order.id;
              return (
                <div key={`orphan-${order.id}`} className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>
                      {pseudo.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold truncate block" style={{ color: "var(--text)" }}>@{pseudo}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Nouveau · veut acheter</span>
                    </div>
                  </div>
                  <div className="ml-4 pl-4 space-y-2" style={{ borderLeft: "2px solid #A855F7" }}>
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" style={{ color: "#A855F7" }} />
                      <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{orderItem || "Pack"}</span>
                      {orderAmount && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md ml-auto" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>{orderAmount}€</span>}
                    </div>
                    {orderPayment && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Methode :</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: orderPayment.toLowerCase() === "paypal" ? "rgba(0,123,255,0.1)" : "rgba(0,41,107,0.1)",
                          color: orderPayment.toLowerCase() === "paypal" ? "#007BFF" : "#00296B",
                        }}>{orderPayment}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => onAcceptOrder(order.id, order.content || "")} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", opacity: isProcessing ? 0.5 : 1 }}>
                        <Check className="w-3.5 h-3.5" /> Valider paiement
                      </button>
                      <button onClick={() => onRefuseOrder(order.id, order.content || "")} disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                        style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", opacity: isProcessing ? 0.5 : 1 }}>
                        <Ban className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Active clients (verified, no pending action) ── */}
            {activeClients.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-2" style={{ background: "rgba(16,185,129,0.05)", borderBottom: "1px solid var(--border)" }}>
                <CheckCircle className="w-3 h-3" style={{ color: "#10B981" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>
                  Clients actifs ({activeClients.length})
                </span>
              </div>
            )}
            {activeClients.map(c => {
              const pseudo = pseudoOf(c);
              const isSnap = !!c.pseudo_snap;
              const profileUrl = isSnap
                ? `https://snapchat.com/add/${c.pseudo_snap}`
                : c.pseudo_insta ? `https://instagram.com/${c.pseudo_insta}` : null;
              const pColor = isSnap ? "#C4A600" : "#C13584";
              const clientCodes = codes.filter(co => co.client?.toLowerCase() === pseudo.toLowerCase());
              const activeCode = clientCodes.find(co => co.active && !co.revoked && new Date(co.expiresAt).getTime() > Date.now());
              return (
                <div key={c.id} className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  {profileUrl ? (
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 no-underline transition-all hover:scale-110"
                      style={{ background: `${pColor}18`, color: pColor }}
                      title={`Voir profil ${isSnap ? "Snapchat" : "Instagram"}`}>
                      {pseudo.charAt(0).toUpperCase()}
                    </a>
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: `${pColor}18`, color: pColor }}>
                      {pseudo.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>@{pseudo}</span>
                      {profileUrl && (
                        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 no-underline">
                          <ExternalLink className="w-2.5 h-2.5" style={{ color: pColor, opacity: 0.6 }} />
                        </a>
                      )}
                    </div>
                    {activeCode ? (
                      <span className="text-[10px]" style={{ color: "#10B981" }}>
                        <Key className="w-2.5 h-2.5 inline mr-0.5" />{activeCode.code} · {activeCode.tier?.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />Pas de code actif
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {clients.length === 0 && pendingOrders.length === 0 && (
              <p className="text-[11px] text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun client</p>
            )}
          </>);
        })()}
      </div>
      <a href="/agence/clients" className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold no-underline"
        style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
        Gestion complete <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  );
}
