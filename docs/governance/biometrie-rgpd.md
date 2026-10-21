# Données biométriques — RGPD & EBIOS (Consigne Additionnelle 1)

La reconnaissance faciale ajoutée au back-office traite des **données
biométriques**, qui sont des **données personnelles sensibles** au sens du RGPD
(art. 9). Même si le labo utilise des données fictives, le cadrage doit être
présenté au jury.

## Nature des données

- **Gabarits faciaux (embeddings SFace, 128 valeurs)** par utilisateur enrôlé,
  stockés dans `services/face-auth/data/faces.json` (git-ignoré).
- On **ne stocke pas les photos** de référence, uniquement le gabarit numérique.
- Les trames caméra sont traitées en mémoire pour l'inférence puis **non
  conservées**.

## Principes RGPD appliqués

- **Minimisation** : seul le gabarit est conservé, pas d'image ; un rôle par
  utilisateur (habilitation), rien de plus.
- **Finalité** : authentification du back-office uniquement.
- **Base légale** (cadre réel) : consentement explicite de l'opérateur à
  l'enrôlement ; une **alternative non biométrique** doit rester possible.
- **Durée de conservation** : le gabarit est supprimé à la révocation de
  l'habilitation (`DELETE` sur l'utilisateur).
- **Sécurité** : service et données **internes au PC Hôte**, jamais exposés sur
  le hotspot ; la vérification mot de passe reste déléguée à `auth-service`
  (séparation biométrie / identifiant-secret).

## Lien EBIOS RM

- **Bien support ajouté** : service de reconnaissance faciale + base des
  gabarits.
- **Événement redouté** : fuite ou détournement des gabarits biométriques
  (gravité élevée — donnée non révocable comme un mot de passe).
- **Mesures** : non-exposition réseau, pas de stockage d'images, suppression à la
  révocation, seuil de correspondance maîtrisé (faux positifs/négatifs), 2ᵉ
  facteur = mot de passe conservé.
- **Anti-rejeu / vivacité** : limite connue — un gabarit comparé à une photo peut
  être trompé par une photo présentée à la caméra (pas de *liveness detection*).
  À documenter comme limite, piste d'évolution.

## Limites assumées (pour le dossier)

- Pas de détection de vivacité (anti-spoofing) dans cette version.
- Seuil de reconnaissance (`FACE_COSINE_THRESHOLD`, 0,363 par défaut) : compromis
  faux acceptations / faux rejets à justifier et, idéalement, à mesurer.
- Caméra navigateur (et non pilote caméra dédié sur l'hôte) : écart temporaire
  vis-à-vis de la contrainte imposée.
