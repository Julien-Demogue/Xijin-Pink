# PCA / PRA

Document jury (FR). Plan de continuité et de reprise d'activité adapté à la
solution livrée.

À expliciter :

- **Scénarios couverts** par la reprise automatique (et ceux qui ne le sont pas).
- **RTO / RPO** par service critique, cohérents avec le démonstrateur — ne pas
  promettre ce que la démo ne montre pas.
- **Responsabilités** : qui / quoi déclenche la reprise (moteur de remédiation),
  rôle de l'opérateur, rôle de l'assistant RAG.
- **Choix de restauration** : redémarrage, bascule, restauration de données.
- **Distinction clé** : rétablir la disponibilité ≠ corriger une compromission ou
  une fuite. Préciser la réponse attendue par type d'incident.
- **Risques résiduels** après reprise.

La preuve de reprise retenue est l'exécution réussie d'une nouvelle transaction
fictive (`paid`), vérifiée par le test de bout en bout de `tests/`.
