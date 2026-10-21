# Runbook — Abus d'authentification (force brute / credential stuffing)

Catégorie d'alerte : `auth-abuse`. Cible : `auth-service`, route `/api/auth/login`.

## Signaux observés

- Rafale d'échecs de connexion : nombreux `login_failed` et HTTP 401 sur
  `/api/auth/login` (`auth_fail_ratio` élevé).
- Tentatives venant d'une ou deux IP source seulement (`top_ip_share` élevé).
- Les événements `login_failed` portent `account_exists` : beaucoup de `false`
  évoque un balayage d'emails, des `true` un bourrage d'identifiants ciblé.
- Les identifiants soumis ne sont jamais journalisés.

## Réponse automatique

1. Bloquer les IP source au niveau du WAF.
2. Appliquer une limite de débit stricte sur `/api/auth/login`.
3. Ne pas redémarrer la base : l'intégrité des comptes n'est pas en cause, c'est
   une attaque de surface d'authentification.

## Vérifier le rétablissement

La disponibilité n'a en général pas été perdue. Vérifier qu'un **compte légitime
peut toujours se connecter** et que le taux de 401 est redevenu normal.

## Escalade manuelle

Si un `login_succeeded` suit une longue rafale d'échecs depuis la même IP, traiter
comme une compromission de compte possible : invalider les sessions du compte et
prévenir un coach.
