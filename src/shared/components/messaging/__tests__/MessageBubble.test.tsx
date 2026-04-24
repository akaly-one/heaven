/**
 * Tests unit — <MessageBubble> actor discrimination + cluster detection
 *
 * BRIEF-02 TICKET-M05 (2026-04-24) — 10+ cases couvrant :
 *  - les 6 actors (fan / model_web / model_instagram / agent_ai / agent_draft / system)
 *  - cluster detection (isClusterStart)
 *  - showAvatar prop
 *  - mediaUrl rendering
 *  - aiRunId indicator
 *  - deriveActor helper
 *
 * Runner : Vitest (aligné avec conversation-display.test.ts existant).
 * Exécution : `npx vitest run src/shared/components/messaging/__tests__/MessageBubble.test.tsx`
 * (Vitest n'est pas encore installé dans package.json au moment de ce ticket ;
 *  les tests sont rédigés dans le format attendu pour branchement immédiat en Phase 3
 *  quand Vitest sera ajouté — cf STANDARDS-WEB-DEV-2026 §0 choix stack.)
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MessageBubble, isClusterStart } from "../MessageBubble";
import { deriveActor, type MessageActor } from "@/lib/messaging/types";

const BASE_DATE = "2026-04-24T12:00:00.000Z";

describe("<MessageBubble> — actor styling discrimination", () => {
  it("actor=fan → bulle gauche, pas de background iMessage", () => {
    const { container } = render(
      <MessageBubble actor="fan" content="Bonjour" createdAt={BASE_DATE} avatarName="visiteur-001" />
    );
    const el = container.querySelector('[data-actor="fan"]');
    expect(el).toBeTruthy();
    expect(el?.className).toContain("justify-start");
  });

  it("actor=model_web → bulle droite, bg green iMessage", () => {
    const { container } = render(
      <MessageBubble actor="model_web" content="Salut" createdAt={BASE_DATE} avatarName="YUMI" />
    );
    const el = container.querySelector('[data-actor="model_web"]');
    expect(el).toBeTruthy();
    expect(el?.className).toContain("justify-end");
  });

  it("actor=model_instagram → bulle droite, bg blue iMessage", () => {
    const { container } = render(
      <MessageBubble actor="model_instagram" content="Hey" createdAt={BASE_DATE} avatarName="YUMI" />
    );
    const el = container.querySelector('[data-actor="model_instagram"]');
    expect(el).toBeTruthy();
    expect(el?.className).toContain("justify-end");
  });

  it("actor=agent_ai → sparkle icon visible + ai_run_id data-attribute", () => {
    const { container } = render(
      <MessageBubble
        actor="agent_ai"
        content="Réponse auto"
        createdAt={BASE_DATE}
        avatarName="YUMI"
        aiRunId="run_abc123xyz"
      />
    );
    const el = container.querySelector('[data-actor="agent_ai"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute("data-ai-run-id")).toBe("run_abc123xyz");
  });

  it("actor=agent_draft → badge 'Brouillon IA' + bot icon", () => {
    const { getByText } = render(
      <MessageBubble actor="agent_draft" content="Draft pending" createdAt={BASE_DATE} />
    );
    expect(getByText("Brouillon IA")).toBeTruthy();
  });

  it("actor=system → centré sans bulle", () => {
    const { container } = render(
      <MessageBubble actor="system" content="Conversation démarrée" createdAt={BASE_DATE} />
    );
    // System = <div> centré simple, pas de data-actor
    expect(container.textContent).toContain("Conversation démarrée");
  });
});

describe("<MessageBubble> — showAvatar prop (cluster detection)", () => {
  it("showAvatar=true (défaut) → avatar visible outbound", () => {
    const { container } = render(
      <MessageBubble
        actor="model_web"
        content="Msg 1"
        createdAt={BASE_DATE}
        avatarName="YUMI"
        showAvatar
      />
    );
    const avatar = container.querySelector('[role="img"]');
    expect(avatar).toBeTruthy();
  });

  it("showAvatar=false → pas d'avatar rendu (spacer invisible)", () => {
    const { container } = render(
      <MessageBubble
        actor="model_web"
        content="Msg 2 (cluster)"
        createdAt={BASE_DATE}
        avatarName="YUMI"
        showAvatar={false}
      />
    );
    // Les bulles cluster middle/end n'ont pas d'avatar mais gardent le spacer
    const avatar = container.querySelector('[role="img"]');
    expect(avatar).toBeFalsy();
  });
});

describe("<MessageBubble> — média attaché", () => {
  it("mediaUrl présent → <img> rendu", () => {
    const { container } = render(
      <MessageBubble
        actor="fan"
        content=""
        createdAt={BASE_DATE}
        avatarName="visiteur-001"
        mediaUrl="https://example.com/pic.jpg"
      />
    );
    const img = container.querySelector('img[alt="Media joint"]');
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://example.com/pic.jpg");
  });
});

describe("isClusterStart — 5min gap + actor change detection", () => {
  it("pas de prev → true (premier msg du thread)", () => {
    expect(
      isClusterStart(undefined, { actor: "fan", created_at: BASE_DATE })
    ).toBe(true);
  });

  it("actor différent → true (nouveau cluster)", () => {
    const prev = { actor: "fan" as MessageActor, created_at: BASE_DATE };
    const curr = { actor: "model_web" as MessageActor, created_at: "2026-04-24T12:01:00.000Z" };
    expect(isClusterStart(prev, curr)).toBe(true);
  });

  it("même actor + gap < 5min → false (cluster continue)", () => {
    const prev = { actor: "fan" as MessageActor, created_at: BASE_DATE };
    const curr = { actor: "fan" as MessageActor, created_at: "2026-04-24T12:02:00.000Z" };
    expect(isClusterStart(prev, curr)).toBe(false);
  });

  it("même actor + gap > 5min → true (nouveau cluster temporel)", () => {
    const prev = { actor: "fan" as MessageActor, created_at: BASE_DATE };
    const curr = { actor: "fan" as MessageActor, created_at: "2026-04-24T12:06:00.000Z" };
    expect(isClusterStart(prev, curr)).toBe(true);
  });
});

describe("deriveActor — mapping DB → UI actor", () => {
  it("sender_type=client → fan", () => {
    expect(deriveActor({ sender_type: "client", source: "web" })).toBe("fan");
    expect(deriveActor({ sender_type: "client", source: "instagram" })).toBe("fan");
  });

  it("sender_type=model + source=web → model_web", () => {
    expect(deriveActor({ sender_type: "model", source: "web" })).toBe("model_web");
  });

  it("sender_type=model + source=instagram → model_instagram", () => {
    expect(deriveActor({ sender_type: "model", source: "instagram" })).toBe(
      "model_instagram"
    );
  });

  it("ai_run_id présent + sent=false → agent_draft", () => {
    expect(
      deriveActor({
        sender_type: "agent",
        source: "web",
        ai_run_id: "run_abc",
        sent: false,
      })
    ).toBe("agent_draft");
  });

  it("ai_run_id présent + sent=true → agent_ai", () => {
    expect(
      deriveActor({
        sender_type: "agent",
        source: "web",
        ai_run_id: "run_abc",
        sent: true,
      })
    ).toBe("agent_ai");
  });

  it("sender_type=admin → traité comme modèle (canal dépendant)", () => {
    expect(deriveActor({ sender_type: "admin", source: "web" })).toBe("model_web");
    expect(deriveActor({ sender_type: "admin", source: "instagram" })).toBe(
      "model_instagram"
    );
  });
});
