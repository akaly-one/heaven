import { CheckCircle, Circle } from "lucide-react";

export const REVENUE_MODELS = [
  { platform: "Fanvue", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: true },
  { platform: "OnlyFans", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "MYM", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "Stripchat", sub: false, ppv: false, tips: true, live: true, gifts: true, custom: true, ai: false },
  { platform: "Snapchat", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "Instagram", sub: false, ppv: false, tips: false, live: false, gifts: false, custom: false, ai: false },
];

export const checkIcon = (v: boolean) => v
  ? <CheckCircle className="w-3.5 h-3.5 mx-auto" style={{ color: "#10B981" }} />
  : <Circle className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--border3, #333)" }} />;
