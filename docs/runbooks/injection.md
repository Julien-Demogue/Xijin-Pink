# Runbook — Tentative d'injection (SQL / XSS / payloads malformés)

Catégorie d'alerte : `injection`. Cible : routes acceptant des entrées
(`/api/auth/*`, `/api/donations/checkout`).

## Signaux observés

- Rafale de rejets de validation (`validation_rejected`) et de HTTP 400 répartis
  sur plusieurs routes (`distinct_routes` anormalement élevé pour une seule IP).
- Entrées au format suspect (chaînes `' OR '1'='1`, `<script>`, `../`, etc.).
- Trafic issu d'une seule IP source avec un user-agent d'outil.

## Réponse automatique

1. Activer / durcir la règle WAF correspondante (OWASP CRS) et bloquer l'IP.
2. Comme les requêtes sont paramétrées et les entrées validées, aucune donnée
   n'est en principe compromise : confirmer l'intégrité plutôt que restaurer.
3. Si un doute subsiste sur l'intégrité, restaurer depuis la dernière sauvegarde
   saine puis revérifier.

## Vérifier le rétablissement

Rejouer une transaction fictive légitime (→ `paid`) **et** contrôler la cohérence
des données (pas de table altérée, pas d'enregistrement inattendu). L'intégrité
vérifiée est la preuve, pas seulement la disponibilité.

## Escalade manuelle

Toute trace indiquant qu'un payload a réellement abouti (erreur SQL dans les
journaux, réponse anormale) impose un arrêt et une escalade immédiate vers un
coach.
