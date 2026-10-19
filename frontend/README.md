# Frontend

Application donateur "Xijin Pink" (thème Octobre Rose) : React + TypeScript +
Tailwind CSS, servie derrière le WAF.

**État actuel : frontend seul, données 100% factices.** Aucun appel réseau
n'est effectué — l'authentification et les transactions sont simulées côté
client (`localStorage`). L'intégration avec `payment-api` et `auth-service`
sera ajoutée dans une itération suivante.

## Fonctionnalités

- Présentation de la fondation Xijin Pink (page d'accueil)
- Faire un don (montant prédéfini ou libre, simulation de paiement)
- Historique des transactions (compte connecté)
- Classement des donateurs avec titres (Donateur → Légende Rose)
- Création de compte / connexion (mock, `localStorage`)
- Édition du profil

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
```

Comptes de démonstration (mot de passe `Rose2026!`) :

- `emilie.rousseau@example.fr`
- `thomas.lefevre@example.fr`

## Autres commandes

```bash
npm run build     # vérifie les types et produit dist/
npm run preview   # sert le build de production localement
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, React Router. Couleurs de marque :
accent `#AA3363`, primaire `#FB5CA1`, secondaire `#FFA2BC` (voir
`tailwind.config.ts`).
