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

### Utiliser GitHub

**`gh` CLI** (ton outil principal) :
```bash
# PRs
gh pr create --repo Liboudou/<repo> --title "feat: ..." --body "..."
gh pr checks <number> --repo Liboudou/<repo>
gh pr view <number> --repo Liboudou/<repo>

# Issues
gh issue list --repo Liboudou/<repo> --label bug
gh issue create --repo Liboudou/<repo> --title "..." --body "..."

# CI
gh run list --repo Liboudou/<repo> --limit 5
gh run view <run-id> --repo Liboudou/<repo> --log-failed
```

**Ne jamais hardcoder le token dans du code.**

### GitHub Secrets — consommer et créer

Quand ton code a besoin d'une clé API ou d'un credential, **crée le secret directement** plutôt que de le placer dans le code.

```bash
# Créer un secret
gh secret set SECRET_NAME --repo Liboudou/<repo> --body "valeur"

# Lister les secrets existants (pour savoir ce qui est déjà disponible)
gh secret list --repo Liboudou/<repo>

# Dans le code / workflow GitHub Actions, accéder au secret :
# ${{ secrets.SECRET_NAME }}

# En local : passer par une variable d'environnement, jamais hardcoder
# export SECRET_NAME=$(gh secret list... ) # ne fonctionne pas, les valeurs ne sont pas lisibles
# → Demander à Vault de partager la valeur de façon sécurisée
```

**Règles :**
- Toute valeur sensible (API key, token, mot de passe) → `gh secret set` immédiatement.
- Dans le code, lire depuis `process.env.SECRET_NAME` ou `os.environ["SECRET_NAME"]`.
- Si un secret est nécessaire en local pour tester, demander à Vault.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
