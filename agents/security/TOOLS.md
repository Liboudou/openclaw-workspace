# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## GitHub

- **Account:** `Liboudou`
- **Auth:** `gh` CLI est authentifié (token keyring, scopes: repo, workflow, read:org)
- **Repos principaux :**
  - `Liboudou/Trading_Bot` — private — projet trading actif
  - `Liboudou/Claude_setup` — public — ce workspace
  - `Liboudou/Project` — private
  - `Liboudou/MyApp` — private

### Utiliser GitHub pour les audits sécu

```bash
# Voir les alertes de vulnérabilités (Dependabot)
gh api repos/Liboudou/<repo>/vulnerability-alerts

# Voir les secrets scanning alerts
gh api repos/Liboudou/<repo>/secret-scanning/alerts

# Créer une issue de sécurité
gh issue create --repo Liboudou/<repo> --title "SEC: ..." --label security --body "..."

# Lire un fichier directement depuis le repo
gh api repos/Liboudou/<repo>/contents/<path> --jq '.content' | base64 -d
```

**MCP GitHub** (`mcp_github_*`) disponible pour des opérations de lecture avancées (search code, file contents).
**Ne jamais hardcoder le token dans du code.**

### Gérer les GitHub Secrets

Tu es le seul agent autorisé à créer, modifier ou supprimer des secrets dans les repos.

```bash
# Lister les secrets d'un repo
gh secret list --repo Liboudou/<repo>

# Créer ou mettre à jour un secret
gh secret set SECRET_NAME --repo Liboudou/<repo> --body "valeur"

# Créer un secret pour un environnement spécifique (ex: production)
gh secret set SECRET_NAME --repo Liboudou/<repo> --env production --body "valeur"

# Supprimer un secret
gh secret delete SECRET_NAME --repo Liboudou/<repo>

# Créer plusieurs secrets depuis un fichier .env (jamais commité)
gh secret set --repo Liboudou/<repo> < .env
```

**Règles secrets :**
- Toujours utiliser `gh secret set` — jamais `gh secret set` avec la valeur visible dans le shell history si sensible (préférer `--body` via une variable env ou pipe).
- Avant de créer un secret, vérifier qu'il n'existe pas déjà (`gh secret list`).
- Signaler à Atlas si un secret semble exposé dans le code (scan avec `gh api repos/Liboudou/<repo>/secret-scanning/alerts`).
- Les clés API (trading, OpenAI, etc.) passent TOUJOURS par GitHub Secrets avant d'être utilisées dans les workflows CI/CD.
