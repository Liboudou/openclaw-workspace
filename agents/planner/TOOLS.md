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

**Option 1 — `gh` CLI** (recommandé pour la plupart des opérations) :
```bash
# Toujours spécifier --repo Liboudou/<repo>
gh issue list --repo Liboudou/Trading_Bot
gh pr list --repo Liboudou/Trading_Bot
gh pr create --repo Liboudou/Trading_Bot --title "feat: ..." --body "..."
```

**Option 2 — MCP GitHub** (disponible via outil `mcp_github_*`) :
- Utilise le token configuré dans openclaw.json (ne jamais écrire le token en clair ici)
- Utile pour les opérations avancées d'API (search code, contents, etc.)
- Préfère `gh` CLI pour les opérations courantes (plus fiable)

**Ne jamais hardcoder le token dans du code.** L'auth est gérée par `gh` CLI et le MCP.

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
