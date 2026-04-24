/**
 * Tests unit — getConversationPseudo + helpers associés
 *
 * BRIEF-02 TICKET-M02 (2026-04-24) — règle unique `@` pour handles externes,
 * jamais `@` pour pseudos anonymes (visiteur-NNN / guest-XXX).
 *
 * Spec : plans/modules/messagerie-contacts/UI-STANDARDS-v1.2026-04-24.md §1.
 *
 * Runner : Vitest (cf STANDARDS-WEB-DEV-2026.md §0 — choix stack).
 * Exécution : `npx vitest run src/shared/lib/messaging/conversation-display.test.ts`
 */

import { describe, it, expect } from "vitest";
import {
  getConversationPseudo,
  getConversationPlatform,
  getExternalUrl,
  type ConversationLike,
} from "./conversation-display";

describe("getConversationPseudo — règle unique header ↔ messagerie", () => {
  // ─── Instagram ──────────────────────────────────────────────────────
  it("Insta sans @ → préfixe @", () => {
    expect(getConversationPseudo({ pseudo_insta: "yumi_club" })).toBe("@yumi_club");
  });

  it("Insta avec @ déjà → pas de double @ (strip then prefix)", () => {
    expect(getConversationPseudo({ pseudo_insta: "@yumi_club" })).toBe("@yumi_club");
  });

  // ─── Snap : handle réel vs anonyme ──────────────────────────────────
  it("Snap avec handle normal → préfixe @", () => {
    expect(getConversationPseudo({ pseudo_snap: "paloma.heaven" })).toBe("@paloma.heaven");
  });

  it("Snap avec handle déjà préfixé @ → pas de double @", () => {
    expect(getConversationPseudo({ pseudo_snap: "@snap_user" })).toBe("@snap_user");
  });

  it("Snap avec 'visiteur-005' → SANS @ (pseudo anonyme)", () => {
    expect(getConversationPseudo({ pseudo_snap: "visiteur-005" })).toBe("visiteur-005");
  });

  it("Snap avec 'Visiteur-ABCD' (case-insensitive) → SANS @", () => {
    expect(getConversationPseudo({ pseudo_snap: "Visiteur-ABCD" })).toBe("Visiteur-ABCD");
  });

  it("Snap avec 'guest-abc123' → SANS @ (pseudo anonyme legacy)", () => {
    expect(getConversationPseudo({ pseudo_snap: "guest-abc123" })).toBe("guest-abc123");
  });

  // ─── pseudo_web ─────────────────────────────────────────────────────
  it("pseudo_web seulement → renvoyé tel quel (déjà formaté visiteur-NNN)", () => {
    expect(getConversationPseudo({ pseudo_web: "visiteur-042" })).toBe("visiteur-042");
  });

  // ─── Fanvue ─────────────────────────────────────────────────────────
  it("fanvue_handle sans @ → préfixe @", () => {
    expect(getConversationPseudo({ fanvue_handle: "yumi" })).toBe("@yumi");
  });

  it("fanvue_handle avec @ → pas de double @", () => {
    expect(getConversationPseudo({ fanvue_handle: "@yumi" })).toBe("@yumi");
  });

  // ─── Fallback fan_id ────────────────────────────────────────────────
  it("Fallback fan_id préfixé 'pseudo:' → visiteur-<last4 lowercase>", () => {
    expect(getConversationPseudo({ fan_id: "pseudo:AAAABBBB-0000-0000-0000-000012AB" })).toBe(
      "visiteur-12ab",
    );
  });

  it("Fallback fan_id plain UUID → visiteur-<last4 lowercase>", () => {
    expect(getConversationPseudo({ fan_id: "abcd-efgh-ijkl-MNOP" })).toBe("visiteur-mnop");
  });

  it("Fallback display_name seul → display_name", () => {
    expect(getConversationPseudo({ display_name: "Paloma" })).toBe("Paloma");
  });

  it("Object vide → 'visiteur'", () => {
    expect(getConversationPseudo({})).toBe("visiteur");
  });

  // ─── Priorité résolution (insta > snap > web > fanvue > fan_id) ────
  it("Priorité : insta > snap", () => {
    expect(
      getConversationPseudo({
        pseudo_insta: "priority_insta",
        pseudo_snap: "fallback_snap",
      }),
    ).toBe("@priority_insta");
  });

  it("Priorité : snap réel > pseudo_web", () => {
    expect(
      getConversationPseudo({
        pseudo_snap: "real_snap",
        pseudo_web: "visiteur-999",
      }),
    ).toBe("@real_snap");
  });

  it("Priorité : pseudo_web > fanvue_handle", () => {
    expect(
      getConversationPseudo({
        pseudo_web: "visiteur-111",
        fanvue_handle: "yumi",
      }),
    ).toBe("visiteur-111");
  });

  it("Priorité : fanvue_handle > fan_id", () => {
    expect(
      getConversationPseudo({
        fanvue_handle: "yumi",
        fan_id: "pseudo:xxxx-yyyy",
      }),
    ).toBe("@yumi");
  });

  // ─── Invariant critique : header vs page = identique ───────────────
  it("INVARIANT cohérence : même conversation → même pseudo dans les 2 vues", () => {
    const conv: ConversationLike = {
      fan_id: "pseudo:1234-5678-9abc-def0",
      pseudo_snap: "visiteur-005",
      pseudo_insta: null,
      pseudo_web: null,
      display_name: null,
    };
    const headerPseudo = getConversationPseudo(conv);
    const pagePseudo = getConversationPseudo(conv);
    expect(headerPseudo).toBe(pagePseudo);
    expect(headerPseudo).toBe("visiteur-005");
  });
});

describe("getConversationPlatform — détection plateforme", () => {
  it("pseudo_insta présent → 'insta'", () => {
    expect(getConversationPlatform({ pseudo_insta: "yumi" })).toBe("insta");
  });

  it("pseudo_snap réel → 'snap'", () => {
    expect(getConversationPlatform({ pseudo_snap: "real_snap" })).toBe("snap");
  });

  it("pseudo_snap contient 'visiteur-NNN' → 'web' (anon stocké dans snap)", () => {
    expect(getConversationPlatform({ pseudo_snap: "visiteur-001" })).toBe("web");
  });

  it("pseudo_web seul → 'web'", () => {
    expect(getConversationPlatform({ pseudo_web: "visiteur-001" })).toBe("web");
  });

  it("object vide → 'unknown'", () => {
    expect(getConversationPlatform({})).toBe("unknown");
  });
});

describe("getExternalUrl — URL externe uniquement pour handles vrais", () => {
  it("Insta réel → URL Instagram", () => {
    expect(getExternalUrl({ pseudo_insta: "yumi" })).toBe("https://instagram.com/yumi");
  });

  it("Insta avec @ → strippé dans URL", () => {
    expect(getExternalUrl({ pseudo_insta: "@yumi" })).toBe("https://instagram.com/yumi");
  });

  it("Snap réel → URL Snapchat", () => {
    expect(getExternalUrl({ pseudo_snap: "paloma" })).toBe("https://snapchat.com/add/paloma");
  });

  it("Snap avec 'visiteur-NNN' → null (pas de vraie URL pour visiteur)", () => {
    expect(getExternalUrl({ pseudo_snap: "visiteur-005" })).toBeNull();
  });

  it("Snap avec 'guest-XXX' → null (legacy anon)", () => {
    expect(getExternalUrl({ pseudo_snap: "guest-abc" })).toBeNull();
  });

  it("Fanvue → URL Fanvue", () => {
    expect(getExternalUrl({ fanvue_handle: "yumi" })).toBe("https://fanvue.com/yumi");
  });

  it("Object vide → null", () => {
    expect(getExternalUrl({})).toBeNull();
  });
});
