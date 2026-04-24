/**
 * Tests unit — detectPseudoCorrection
 *
 * BRIEF-16 Phase G2 (2026-04-25) — intent "correction pseudo".
 *
 * Pondération :
 *  - keyword (FR/EN) : +0.5
 *  - referenceCode  : +0.4
 *  - oldPseudo      : +0.1
 * Seuil activation : confidence >= 0.5
 *
 * Runner : Vitest (aligné STANDARDS-WEB-DEV-2026.md §0).
 * Exécution : `npx vitest run src/shared/lib/ai-agent/intents/pseudo-correction.test.ts`
 */

import { describe, it, expect } from "vitest";
import {
  detectPseudoCorrection,
  formatPseudoCorrectionAlert,
} from "./pseudo-correction";

describe("detectPseudoCorrection — pondération confidence", () => {
  // ─── (1) Correction reconnue (keyword + référence + ancien pseudo) ─────
  it("correction reconnue — message complet avec ref + keyword + ancien pseudo", () => {
    const msg =
      "Salut, j'ai payé le pack Gold avec le pseudo @wrongone mais je me suis trompé, voici ma ref YUMI-PGLD-K3M9X2, ancien pseudo @wrongone";
    const match = detectPseudoCorrection(msg, "rightone");
    expect(match.isCorrection).toBe(true);
    expect(match.confidence).toBeCloseTo(1.0, 2);
    expect(match.referenceCode).toBe("YUMI-PGLD-K3M9X2");
    expect(match.oldPseudo).toBe("wrongone");
    expect(match.newPseudo).toBe("rightone");
    expect(match.reasons).toContain("keyword_match");
    expect(match.reasons).toContain("ref_code_match");
    expect(match.reasons).toContain("old_pseudo_match");
  });

  // ─── (2) Pas reconnue (message banal) ──────────────────────────────────
  it("pas de correction — simple salut", () => {
    const match = detectPseudoCorrection("Coucou bb, tu fais quoi ?", "luc42");
    expect(match.isCorrection).toBe(false);
    expect(match.confidence).toBe(0);
    expect(match.referenceCode).toBeUndefined();
    expect(match.oldPseudo).toBeUndefined();
  });

  // ─── (3) Reconnaissance partielle (keyword only, confidence = 0.5) ────
  it("reconnaissance partielle — keyword seul suffit au seuil 0.5", () => {
    const match = detectPseudoCorrection(
      "j'ai fait une erreur de pseudo, tu peux m'aider ?",
      "newlewis"
    );
    expect(match.isCorrection).toBe(true);
    expect(match.confidence).toBeCloseTo(0.5, 2);
    expect(match.reasons).toContain("keyword_match");
    expect(match.referenceCode).toBeUndefined();
  });

  // ─── (4) Regex ref code stricte (format YUMI-PGLD-K3M9X2) ──────────────
  it("regex référence code — détecte le format human-readable NB", () => {
    const match = detectPseudoCorrection(
      "Ma référence c'est YUMI-P42-ABC123, tu peux checker ?",
      "zoe"
    );
    // keyword absent, ref matche → 0.4 → sous seuil
    expect(match.isCorrection).toBe(false);
    expect(match.confidence).toBeCloseTo(0.4, 2);
    expect(match.referenceCode).toBe("YUMI-P42-ABC123");
  });

  // ─── (5) Edge case — ref avec casse mixte, keyword EN, ancien pseudo ──
  it("edge case — anglais + casse mixte + old pseudo", () => {
    const match = detectPseudoCorrection(
      "hey I wrote the wrong username, previous was @oldAccount, ref yumi-pglD-abc123",
      "correctuser"
    );
    expect(match.isCorrection).toBe(true);
    // wrong username = keyword_match, previous = old_pseudo, ref = ref_code
    expect(match.confidence).toBeCloseTo(1.0, 2);
    // Ref normalisée en UPPERCASE
    expect(match.referenceCode).toBe("YUMI-PGLD-ABC123");
    expect(match.oldPseudo).toBe("oldaccount");
  });

  // ─── (6) Edge case — message vide ──────────────────────────────────────
  it("edge case — message vide ne déclenche pas", () => {
    const match = detectPseudoCorrection("", "lucky");
    expect(match.isCorrection).toBe(false);
    expect(match.confidence).toBe(0);
    expect(match.reasons).toContain("empty_message");
  });
});

describe("formatPseudoCorrectionAlert — injection system prompt", () => {
  it("no match → string vide", () => {
    const out = formatPseudoCorrectionAlert({
      isCorrection: false,
      confidence: 0,
      reasons: [],
    });
    expect(out).toBe("");
  });

  it("match complet → alerte structurée avec ref + old/new", () => {
    const out = formatPseudoCorrectionAlert({
      isCorrection: true,
      confidence: 1.0,
      reasons: ["keyword_match", "ref_code_match", "old_pseudo_match"],
      referenceCode: "YUMI-PGLD-K3M9X2",
      oldPseudo: "wrongone",
      newPseudo: "rightone",
    });
    expect(out).toContain("ALERTE CORRECTION PSEUDO");
    expect(out).toContain("YUMI-PGLD-K3M9X2");
    expect(out).toContain("@wrongone");
    expect(out).toContain("@rightone");
    expect(out).toContain("N'invente jamais");
  });
});
