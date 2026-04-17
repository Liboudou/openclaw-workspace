# ACTIVITY.md — Team Activity Tracker

Ce fichier est le registre central d'activité de l'équipe. Chaque agent y inscrit ses interventions.
Le CTO (Main) et Atlas (Planner) le consultent pour suivre la production et la consommation de l'équipe.

## Comment ça fonctionne

Chaque agent, **en fin de tâche**, ajoute une entrée dans la section du jour. Atlas compile les synthèses.

### Format d'entrée

```
- [HH:MM] **NomAgent** | type: [task|review|audit|design|plan|analysis] | input: ~Xk tok | output: ~Xk tok | résultat: "<1 phrase>"
```

Estimation des tokens :
- Message court (1 paragraphe) → ~200-500 tokens
- Code review d'un fichier → ~2k-5k tokens
- Implémentation d'un composant → ~3k-10k tokens
- Audit sécurité → ~5k-15k tokens
- Plan de projet → ~2k-5k tokens

Les agents estiment leur consommation input/output en ordre de grandeur. Ce n'est pas une mesure exacte, c'est un tracker d'activité.

---

## Registre quotidien

### 2026-04-12

_Aucune activité encore._

---

## Synthèses hebdomadaires

_Atlas publie une synthèse le vendredi dans le channel du CTO._

Format :
```
📊 Synthèse semaine du [date]
- Tâches complétées : X
- Agents actifs : X/10
- Tokens estimés : ~Xk in / ~Xk out
- Production : [résumé des livrables]
- Ratio production/consommation : [commentaire]
```
