import { FlaskConical, Megaphone, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";

const PILLARS = [
  {
    icon: Megaphone,
    title: "Sensibilisation",
    description:
      "Nous informons le grand public sur le dépistage précoce et les gestes qui sauvent des vies.",
  },
  {
    icon: UsersRound,
    title: "Soutien aux patientes",
    description:
      "Nous finançons un accompagnement humain et matériel pour les femmes touchées par la maladie.",
  },
  {
    icon: FlaskConical,
    title: "Recherche médicale",
    description:
      "Nous reversons une partie des dons à des programmes de recherche sur le cancer du sein.",
  },
];

export function MissionSection() {
  return (
    <section className="py-16">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">Notre mission</h2>
          <p className="mt-3 text-gray-600">
            La fondation Xijin Pink agit tout au long de l'année pour accompagner
            la lutte contre le cancer du sein, au-delà du mois d'Octobre Rose.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title} variant="default" className="flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary-soft text-brand-accent">
                <pillar.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-gray-900">{pillar.title}</p>
              <p className="text-sm text-gray-500">{pillar.description}</p>
            </Card>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
