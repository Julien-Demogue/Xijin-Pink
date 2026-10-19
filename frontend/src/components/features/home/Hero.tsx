import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-brand-primary-soft to-gray-50">
      <PageContainer className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-brand-accent-dark shadow-sm">
          Octobre Rose · Fondation Xijin Pink
        </span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Ensemble contre le cancer du sein
        </h1>
        <p className="max-w-xl text-base text-gray-600 sm:text-lg">
          Chaque don soutient le dépistage, l'accompagnement des patientes et la
          recherche médicale. Rejoignez notre communauté de donateurs.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/don">
            <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Faire un don
            </Button>
          </Link>
          <Link to="/classement">
            <Button size="lg" variant="outline" leftIcon={<Trophy className="h-5 w-5" />}>
              Voir le classement
            </Button>
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
