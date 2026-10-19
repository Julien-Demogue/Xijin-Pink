import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <PageContainer className="grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Heart className="h-4 w-4 text-brand-primary" fill="currentColor" />
            Xijin Pink
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Ensemble contre le cancer du sein, un don à la fois.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">Association</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-brand-accent">
                Présentation
              </Link>
            </li>
            <li>
              <Link to="/don" className="hover:text-brand-accent">
                Faire un don
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">Communauté</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>
              <Link to="/classement" className="hover:text-brand-accent">
                Classement des donateurs
              </Link>
            </li>
            <li>
              <Link to="/connexion" className="hover:text-brand-accent">
                Connexion
              </Link>
            </li>
          </ul>
        </div>
      </PageContainer>

      <div className="border-t border-gray-100 py-6">
        <PageContainer className="flex flex-col items-center justify-between gap-2 text-xs text-gray-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Xijin Pink — Projet pédagogique EPSI.</p>
          <p>Toutes les données et tous les dons affichés sont fictifs.</p>
        </PageContainer>
      </div>
    </footer>
  );
}
