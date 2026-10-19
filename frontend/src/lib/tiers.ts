import {
  Crown,
  Feather,
  Gem,
  Heart,
  HeartHandshake,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface DonorTier {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
}

// Mirrors the `titles` table seeded in infra/db/init/01-schema.sql — the
// backend resolves the label, this only maps it to an icon/style.
const TIERS: Record<string, Omit<DonorTier, "label">> = {
  Soutien: {
    icon: Heart,
    badgeClassName: "bg-brand-secondary-soft text-brand-secondary-dark",
  },
  Donateur: {
    icon: HeartHandshake,
    badgeClassName: "bg-brand-secondary text-white",
  },
  "Grand donateur": {
    icon: Gem,
    badgeClassName: "bg-brand-primary text-white",
  },
  Bienfaiteur: {
    icon: Feather,
    badgeClassName: "bg-brand-accent-light text-brand-accent-dark",
  },
  Mécène: {
    icon: Crown,
    badgeClassName: "bg-brand-accent text-white",
  },
  "Ambassadeur Xijin Pink": {
    icon: Trophy,
    badgeClassName: "bg-gradient-to-r from-brand-accent to-brand-primary text-white shadow-brand",
  },
};

const FALLBACK_TIER: Omit<DonorTier, "label"> = {
  icon: Heart,
  badgeClassName: "bg-gray-100 text-gray-600",
};

export function getDonorTier(title: string | null): DonorTier {
  const label = title ?? "Soutien";
  return { label, ...(TIERS[label] ?? FALLBACK_TIER) };
}
