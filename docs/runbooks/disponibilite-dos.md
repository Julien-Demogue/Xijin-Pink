# Runbook — Indisponibilité / Déni de service (DoS)

Catégorie d'alerte : `availability`. Cible typique : `payment-api`.

## Signaux observés

- Pic du débit de requêtes (`req_rate_per_s`) très au-dessus de la normale.
- Latence en forte hausse (`latency_p95_ms`), puis erreurs serveur
  (`error_rate_5xx`) quand le service sature.
- Trafic concentré sur quelques IP source (`top_ip_share` élevé).
- Le service peut cesser d'émettre ses propres journaux ; le WAF, lui, continue
  de voir les 502/504.

## Réponse automatique (moteur de remédiation)

1. Resserrer la limite de débit au niveau du WAF pour les IP source en cause.
2. Redémarrer / mettre à l'échelle le conteneur `payment-api`.
3. Vérifier que l'API répond à nouveau (`/health`) avant de clore l'incident.

## Vérifier le rétablissement

Le redémarrage d'un conteneur ne suffit pas. La preuve de rétablissement est
qu'**une nouvelle transaction fictive atteint l'état `paid`** : rejouer le
parcours de don complet (checkout → confirmation PSP → webhook). Tant que ce test
échoue, l'incident n'est pas résolu.

## Escalade manuelle

Si le débit d'attaque dépasse la capacité du WAF, ou si le rétablissement
automatique échoue deux fois de suite, prévenir un coach et envisager le blocage
réseau des IP au niveau du point d'accès.
