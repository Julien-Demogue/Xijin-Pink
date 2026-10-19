import { Hero } from "@/components/features/home/Hero";
import { MissionStats } from "@/components/features/home/MissionStats";
import { MissionSection } from "@/components/features/home/MissionSection";
import { CtaBanner } from "@/components/features/home/CtaBanner";

export function HomePage() {
  return (
    <>
      <Hero />
      <MissionStats />
      <MissionSection />
      <CtaBanner />
    </>
  );
}
