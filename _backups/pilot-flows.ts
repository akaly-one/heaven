// ══════════════════════════════════════════════
//  PILOT — Flow Configurations for Heaven
// ══════════════════════════════════════════════

export interface PilotFlowStep {
  id: string;
  question: string;
  type: "text" | "select" | "number";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface PilotFlow {
  id: string;
  label: string;
  iconName: string;
  color: string;
  steps: PilotFlowStep[];
  action: "api" | "callback";
  apiEndpoint?: string;
  buildBody: (answers: Record<string, string>, modelSlug: string) => Record<string, unknown>;
}

// ── Nouveau post ──
const newPost: PilotFlow = {
  id: "nouveau_post",
  label: "Nouveau post",
  iconName: "PenSquare",
  color: "#E84393",
  action: "api",
  apiEndpoint: "/api/posts",
  steps: [
    { id: "tier", question: "Niveau d'acces ?", type: "select", options: ["public", "silver", "gold", "black", "platinum"], required: true },
    { id: "content", question: "Contenu du post ?", type: "text", required: true, placeholder: "Ecris ton message..." },
  ],
  buildBody: (a, modelSlug) => ({
    model: modelSlug,
    content: a.content,
    tier_required: a.tier || "public",
  }),
};

// ── Generer code d'acces ──
const generateCode: PilotFlow = {
  id: "generer_code",
  label: "Generer un code",
  iconName: "Key",
  color: "#F59E0B",
  action: "callback",
  steps: [
    { id: "client", question: "Pseudo du client ?", type: "text", required: true, placeholder: "Ex: @username" },
    { id: "tier", question: "Quel pack ?", type: "select", options: ["silver", "gold", "black", "platinum"], required: true },
    { id: "duration", question: "Duree ?", type: "select", options: ["7", "30", "90"], required: true },
    { id: "platform", question: "Plateforme ?", type: "select", options: ["snapchat", "instagram", "autre"], required: true },
  ],
  buildBody: (a) => ({
    client: a.client,
    tier: a.tier,
    duration: Number(a.duration) || 30,
    platform: a.platform || "instagram",
    type: "paid",
  }),
};

// ── Planifier contenu ──
const planContent: PilotFlow = {
  id: "planifier_contenu",
  label: "Planifier contenu",
  iconName: "Calendar",
  color: "#06B6D4",
  action: "callback",
  steps: [
    { id: "type", question: "Type de contenu ?", type: "select", options: ["Photos", "Videos", "Reels", "Stories", "Live"], required: true },
    { id: "plateforme", question: "Pour quelle plateforme ?", type: "select", options: ["Instagram", "OnlyFans", "Fanvue", "Snapchat", "TikTok"], required: true },
    { id: "description", question: "Description ?", type: "text", placeholder: "Ex: Shooting lingerie pour story" },
  ],
  buildBody: (a, modelSlug) => ({
    model: modelSlug,
    type: a.type,
    plateforme: a.plateforme,
    description: a.description || "",
    status: "planifie",
    createdAt: new Date().toISOString(),
  }),
};

export const HEAVEN_FLOWS: PilotFlow[] = [newPost, generateCode, planContent];

export function getHeavenFlows(): PilotFlow[] {
  return HEAVEN_FLOWS;
}
