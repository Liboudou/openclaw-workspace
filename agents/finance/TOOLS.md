# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## GitHub

- **Account:** `Liboudou`
- **Auth:** `gh` CLI est authentifié (token keyring, scopes: repo, workflow, read:org)
- **Repo principal :** `Liboudou/Trading_Bot` (private)

### Utiliser GitHub pour le trading bot

```bash
# Voir le code existant
gh api repos/Liboudou/Trading_Bot/contents/ --jq '.[].name'

# Créer une PR pour une nouvelle stratégie
gh pr create --repo Liboudou/Trading_Bot --title "strat: momentum cross 4h" --body "Backtest: Sharpe 1.8, MaxDD 12%"

# Suivre les issues de trading
gh issue list --repo Liboudou/Trading_Bot
gh issue create --repo Liboudou/Trading_Bot --title "[STRAT] ..." --label strategy
```

**MCP GitHub** disponible pour lire directement les fichiers de stratégie existants avant d'en créer de nouvelles.
**Ne jamais hardcoder les API keys d'exchanges dans le code.** Utilise des variables d'environnement ou un vault.

## Finance / Trading
