---
name: github
description: "Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries."
---

# GitHub Skill

## ⚠️ À lire en premier

Le compte GitHub est **`Liboudou`**. Le `gh` CLI est déjà authentifié — pas besoin de token, pas besoin de login.

**Toujours spécifier `--repo Liboudou/<repo>`** quand tu n'es pas dans un répertoire git du projet.

Repos disponibles : `Trading_Bot` (private), `Claude_setup` (public), `Project` (private), `MyApp` (private).

### Deux façons d'utiliser GitHub

**`gh` CLI** — pour toutes les opérations courantes (PRs, issues, CI) :
```bash
gh pr list --repo Liboudou/Trading_Bot
```

**MCP GitHub** (`mcp_github_*` tools) — pour lire des fichiers, chercher du code, opérations d'API avancées. Utilise le token configuré dans openclaw.json automatiquement.

Quand tu n'es pas sûr → utilise `gh` CLI, c'est plus fiable.

## Pull Requests

Check CI status on a PR:
```bash
gh pr checks 55 --repo owner/repo
```

List recent workflow runs:
```bash
gh run list --repo owner/repo --limit 10
```

View a run and see which steps failed:
```bash
gh run view <run-id> --repo owner/repo
```

View logs for failed steps only:
```bash
gh run view <run-id> --repo owner/repo --log-failed
```

## API for Advanced Queries

The `gh api` command is useful for accessing data not available through other subcommands.

Get PR with specific fields:
```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

## JSON Output

Most commands support `--json` for structured output.  You can use `--jq` to filter:

```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```
