import { Handshake, Heart, PiggyBank, Sparkles } from "lucide-react";
import { MISSION_STATS } from "@/data/missionStats";
import { StatTile } from "@/components/ui/StatTile";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatEuros } from "@/lib/format";

export function MissionStats() {
  return (
    <section className="py-16">
      <PageContainer className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={PiggyBank} value={formatEuros(MISSION_STATS.totalCollected)} label="Collectés" />
        <StatTile icon={Heart} value={`${MISSION_STATS.donorsCount.toLocaleString("fr-FR")}`} label="Donateurs" />
        <StatTile icon={Handshake} value={`${MISSION_STATS.partnersCount}`} label="Partenaires" />
        <StatTile icon={Sparkles} value={`${MISSION_STATS.yearsActive} ans`} label="D'engagement" />
      </PageContainer>
    </section>
  );
}
