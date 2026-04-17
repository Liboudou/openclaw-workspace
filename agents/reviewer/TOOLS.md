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

### Utiliser GitHub pour les reviews

```bash
# Voir le diff d'une PR
gh pr diff <number> --repo Liboudou/<repo>

# Voir les fichiers changés
gh pr view <number> --repo Liboudou/<repo> --json files,additions,deletions

# Approuver
gh pr review <number> --repo Liboudou/<repo> --approve --body "LGTM"

# Demander des changements
gh pr review <number> --repo Liboudou/<repo> --request-changes --body "Issues: ..."

# Vérifier le CI
gh pr checks <number> --repo Liboudou/<repo>
```

**Ne jamais hardcoder le token dans du code.**
