import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";

export function CtaBanner() {
  return (
    <section className="py-16">
      <PageContainer>
        <div className="flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-r from-brand-accent to-brand-primary px-6 py-14 text-center shadow-brand sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Chaque don compte</h2>
          <p className="max-w-lg text-sm text-white/90 sm:text-base">
            Quelques euros suffisent à faire la différence pour une patiente ou
            une équipe de recherche. Participez dès aujourd'hui.
          </p>
          <Link to="/don">
            <Button size="lg" variant="light" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Je fais un don
            </Button>
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
