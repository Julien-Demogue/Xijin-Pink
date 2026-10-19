import { Crown, Feather, Gem, Heart, HeartHandshake, type LucideIcon } from "lucide-react";

export interface DonorTier {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
}

const TIERS: Array<{ minTotal: number; tier: DonorTier }> = [
  {
    minTotal: 1500,
    tier: {
      label: "Légende Rose",
      icon: Crown,
      badgeClassName: "bg-gradient-to-r from-brand-accent to-brand-primary text-white shadow-brand",
    },
  },
  {
    minTotal: 500,
    tier: {
      label: "Ange Rose",
      icon: Feather,
      badgeClassName: "bg-brand-accent-light text-brand-accent-dark",
    },
  },
  {
    minTotal: 200,
    tier: {
      label: "Grand Donateur",
      icon: Gem,
      badgeClassName: "bg-brand-primary text-white",
    },
  },
  {
    minTotal: 50,
    tier: {
      label: "Donateur Engagé",
      icon: HeartHandshake,
      badgeClassName: "bg-brand-secondary text-white",
    },
  },
  {
    minTotal: 0,
    tier: {
      label: "Donateur",
      icon: Heart,
      badgeClassName: "bg-brand-secondary-soft text-brand-secondary-dark",
    },
  },
];

export function getDonorTier(totalDonated: number): DonorTier {
  const match = TIERS.find((entry) => totalDonated >= entry.minTotal);
  return match?.tier ?? TIERS[TIERS.length - 1].tier;
}
