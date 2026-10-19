import { useState } from "react";
import { Heart, LogOut, Menu, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/cn";

const PUBLIC_LINKS = [
  { to: "/", label: "Accueil" },
  { to: "/don", label: "Faire un don" },
  { to: "/classement", label: "Classement" },
];

const AUTHENTICATED_LINKS = [{ to: "/historique", label: "Mon historique" }];

export function Navbar() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const links = isAuthenticated ? [...PUBLIC_LINKS, ...AUTHENTICATED_LINKS] : PUBLIC_LINKS;

  function handleLogout() {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
      <PageContainer className="flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white">
            <Heart className="h-4 w-4" fill="currentColor" />
          </span>
          Xijin Pink
        </NavLink>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium text-gray-600 transition-colors hover:text-brand-accent",
                  isActive && "text-brand-accent",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated && currentUser ? (
            <>
              <NavLink to="/profil" className="flex items-center gap-2">
                <Avatar name={currentUser.name} size="sm" />
                <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
              </NavLink>
              <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/connexion">
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
              </NavLink>
              <NavLink to="/inscription">
                <Button variant="primary" size="sm">
                  Créer un compte
                </Button>
              </NavLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label="Ouvrir le menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </PageContainer>

      {isMenuOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <PageContainer className="flex flex-col gap-1 py-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50",
                    isActive && "bg-brand-primary-soft text-brand-accent-dark",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-3">
              {isAuthenticated && currentUser ? (
                <>
                  <NavLink
                    to="/profil"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Avatar name={currentUser.name} size="sm" />
                    Mon profil
                  </NavLink>
                  <Button variant="outline" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <NavLink to="/connexion" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" fullWidth>
                      Connexion
                    </Button>
                  </NavLink>
                  <NavLink to="/inscription" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="primary" fullWidth>
                      Créer un compte
                    </Button>
                  </NavLink>
                </>
              )}
            </div>
          </PageContainer>
        </div>
      )}
    </header>
  );
}
