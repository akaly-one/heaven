import { DollarSign, Users, Camera, Heart } from "lucide-react";

export type ActiveTab = "objectifs" | "plateformes" | "simulateur";

export const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  revenue: DollarSign,
  subscribers: Users,
  content: Camera,
  engagement: Heart,
};
