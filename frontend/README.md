# Frontend

Application donateur "Xijin Pink" (thème Octobre Rose) : React + TypeScript +
Tailwind CSS, servie derrière le WAF.

**État actuel : branché sur le vrai backend** (`auth-service`, `payment-api`,
`psp-simulator`, voir [infra/](../infra/README.md)). Plus de données mockées
ni de `localStorage` applicatif : l'authentification utilise un vrai JWT, les
dons déclenchent un vrai checkout PSP (redirection), l'historique et le
classement viennent de l'API.

## Fonctionnalités

- Présentation de la fondation Xijin Pink (page d'accueil)
- Faire un don (montant prédéfini ou libre, compte ou email anonyme) —
  redirige vers le simulateur de paiement (`psp-simulator`) puis revient sur
  `/don/retour`
- Historique des transactions + total donné et titre (compte connecté)
- Classement des donateurs avec titres (table `titles`, résolus par l'API)
- Création de compte / connexion (JWT via `auth-service`)
- Édition du profil (nom, bio — l'email n'est pas modifiable)

## Démarrer

Le backend doit tourner (voir [infra/README.md](../infra/README.md) :
`cd infra && docker compose up --build`), puis :

```bash
cp .env.example .env   # ajuster si les API ne tournent pas sur localhost
npm install
npm run dev             # http://localhost:5173
```

`.env` pointe par défaut vers `auth-service` (`:3001`) et `payment-api`
(`:3002`) en local. Sans backend démarré, les pages qui appellent l'API
(don, historique, classement, connexion...) afficheront une erreur réseau
explicite plutôt que de planter.

## Autres commandes

```bash
npm run build     # vérifie les types et produit dist/
npm run preview   # sert le build de production localement
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, React Router. Couleurs de marque :
accent `#AA3363`, primaire `#FB5CA1`, secondaire `#FFA2BC` (voir
`tailwind.config.ts`). Client API minimal dans `src/lib/apiClient.ts` (pas de
librairie HTTP tierce).
