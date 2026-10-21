# Runbook — Tentative d'exfiltration de données

Catégorie d'alerte : `exfiltration`. Cible : `payment-api` (historique,
classement).

## Signaux observés

- Volume de données sortantes anormal : `bytes_out_sum` et `bytes_out_p95` très
  au-dessus de la normale.
- Récupérations répétées d'un même point d'accès volumineux (historique,
  classement) depuis une seule IP source.
- Débit soutenu mais réponses de grande taille, plutôt qu'un pic de requêtes.

## Réponse automatique

1. Contenir : bloquer l'IP source au niveau du WAF et couper le flux sortant
   anormal.
2. Révoquer les jetons / sessions de l'auteur présumé si la collecte est
   authentifiée.
3. Préserver les journaux de la fenêtre concernée pour analyse (SIEM).

## Vérifier le rétablissement

Confirmer qu'aucune nouvelle requête anormale en `bytes_out` ne subsiste et que
les points d'accès volumineux répondent à un débit normal. Vérifier qu'aucune
donnée fictive sensible n'a fuité au-delà du périmètre du labo.

## Escalade manuelle

Comme toutes les données sont fictives, le risque réel est nul ; néanmoins,
documenter la fenêtre et l'IP pour le dossier, et prévenir un coach si la collecte
a contourné le WAF.
