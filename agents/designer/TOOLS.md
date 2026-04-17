# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## GitHub

- **Account:** `Liboudou`
- **Auth:** `gh` CLI est authentifié (token keyring, scopes: repo, workflow, read:org)
- **Repos principaux :**
  - `Liboudou/Trading_Bot` — private — projet trading actif
  - `Liboudou/Claude_setup` — public — ce workspace
  - `Liboudou/MyApp` — private

### Utiliser GitHub

```bash
gh pr create --repo Liboudou/<repo> --title "design: ..." --body "..."
gh issue list --repo Liboudou/<repo> --label design
```

**Ne jamais hardcoder le token dans du code.**

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
