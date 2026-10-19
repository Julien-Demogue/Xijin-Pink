import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <PageContainer className="py-24">
      <EmptyState
        icon={Compass}
        title="404 — Page introuvable"
        description="La page que vous recherchez n'existe pas ou a été déplacée."
        action={
          <Link to="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
