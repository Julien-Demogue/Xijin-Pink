# Analyse de risques — EBIOS Risk Manager

Document jury (FR). À compléter dès le lundi (kick-off) et à faire valider par les
coachs. L'analyse doit rester liée à l'architecture et aux essais réels, pas être
un rapport générique.

## Atelier 1 — Cadrage & valeurs métier

- **Valeur métier critique** : capacité à traiter une transaction / un don.
- **Biens supports** : `payment-api`, `database`, `psp-simulator`, `auth-service`,
  WAF, moteur de remédiation, chaîne d'observabilité.
- **Événements redoutés** (à coter : gravité) :
  - indisponibilité du service de paiement ;
  - altération / fuite de données fictives ;
  - détournement du moteur de remédiation comme voie d'élévation de privilèges.

## Atelier 2 — Sources de risque

Attaquant du labo (PC Attaquant) jouant un acteur malveillant plausible sur une
plateforme de paiement.

## Atelier 3 — Scénarios stratégiques

À relier aux scénarios d'attaque de `redteam/` (DoS contrôlé, injection,
tentative d'exfiltration).

## Atelier 4 — Scénarios opérationnels

Chemin technique de chaque scénario jusqu'à l'événement redouté, et point de
détection par l'observabilité / le ML.

## Atelier 5 — Traitement du risque

Mesures : WAF + rate limiting, durcissement, gestion des secrets (Vault/SOPS),
SIEM/SOC, remédiation automatique. Arbitrages et risques résiduels après reprise.

> Les objectifs RTO/RPO sont définis dans [pca-pra.md](pca-pra.md), cohérents avec
> ce que la démonstration prouve réellement.
