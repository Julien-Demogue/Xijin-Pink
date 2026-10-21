# Runbook — Anomalie de catégorie inconnue

Catégorie d'alerte : `unknown` (le classifieur de catégorie n'a pas dépassé le
seuil de confiance). À utiliser quand une anomalie est détectée mais que son type
n'est pas déterminé.

## Signaux observés

- Le détecteur a levé une alerte (`anomaly_score` au-dessus du seuil, état
  `firing`) mais `category.label = unknown`.
- Consulter l'`evidence` de l'alerte : les features qui dévient le plus
  (`observed` vs `expected`) orientent vers la bonne famille d'incident.

## Réponse automatique (générique)

1. Appliquer la réponse générique : redémarrer la cible et resserrer la limite de
   débit au WAF.
2. Lancer la vérification de rétablissement standard.

## Vérifier le rétablissement

Rejouer une transaction fictive complète (→ `paid`). Si elle réussit et que le
score d'anomalie est redescendu sous le seuil de façon stable, l'incident est
considéré comme résolu.

## Choisir le bon runbook

Selon les features dominantes de l'`evidence`, se reporter au runbook adapté :

- `req_rate_per_s` / `latency_p95_ms` / `error_rate_5xx` → [disponibilité](disponibilite-dos.md)
- `auth_fail_ratio` → [force brute](force-brute-authentification.md)
- `error_rate_4xx` / `distinct_routes` → [injection](injection.md)
- `bytes_out_sum` / `bytes_out_p95` → [exfiltration](exfiltration.md)

## Escalade manuelle

Si l'anomalie persiste après une remédiation générique, ou si l'`evidence` ne
correspond à aucun runbook, prévenir un coach.
