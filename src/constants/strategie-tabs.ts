import { DollarSign, Users, Camera, Heart } from "lucide-react";

export type ActiveTab = "plateformes" | "simulateur" | "onboarding" | "tactique" | "objectifs";

export const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  revenue: DollarSign,
  subscribers: Users,
  content: Camera,
  engagement: Heart,
};
