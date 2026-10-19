import { getDonorTier } from "@/lib/tiers";
import { Badge } from "@/components/ui/Badge";

export function DonorTierBadge({ totalDonated }: { totalDonated: number }) {
  const tier = getDonorTier(totalDonated);
  const Icon = tier.icon;
  return (
    <Badge tone="custom" className={tier.badgeClassName} icon={<Icon className="h-3.5 w-3.5" />}>
      {tier.label}
    </Badge>
  );
}
