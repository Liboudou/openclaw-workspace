# OpenClaw Observability — Agent Tracing

Système de tracing en temps réel pour les agents OpenClaw via **OpenTelemetry + Jaeger**.

## Architecture

```
Main Agent (orchestrator)
   ├── Sub-Agent: architect
   ├── Sub-Agent: coder
   └── Sub-Agent: reviewer
         │
    OpenTelemetry SDK
         │
    OTLP/HTTP → localhost:4318
         │
    Jaeger (Docker)
         │
    UI → http://localhost:16686
```

## Démarrage rapide

### 1. Lancer le stack complet (recommandé)

```cmd
trace-start.cmd
```

Ceci lance :
- Jaeger (Docker) sur les ports 16686 (UI) et 4318 (OTLP)
- Le session watcher (surveillance passive des agents)
- Le gateway OpenClaw avec tracing activé

### 2. Ou manuellement

```cmd
rem Lancer Jaeger
docker compose -f workspace\observability\docker-compose.yml up -d

rem Lancer le gateway avec tracing
gateway-traced.cmd

rem (optionnel) Lancer le watcher de sessions
cd workspace && node observability\session-watcher.js
```

### 3. Vérifier que ça fonctionne

```cmd
cd workspace
node observability\test-trace.js
```

Puis ouvrir **http://localhost:16686**, chercher le service `openclaw-gateway`.

## Arrêter

```cmd
trace-stop.cmd
```

## Fichiers

| Fichier | Rôle |
|---------|------|
| `observability/tracing.js` | Init OpenTelemetry SDK (chargé via `--require`) |
| `observability/agent-tracer.js` | Helpers pour tracer agents, LLM, tools |
| `observability/session-watcher.js` | Surveillance passive des sessions/dispatches |
| `observability/docker-compose.yml` | Jaeger all-in-one avec stockage persistant |
| `observability/test-trace.js` | Test de validation du pipeline |
| `gateway-traced.cmd` | Gateway avec tracing activé |
| `trace-start.cmd` | Lance tout le stack d'observabilité |
| `trace-stop.cmd` | Arrête Jaeger + watcher |

## Ce que vous verrez dans Jaeger

```
agent:main                          [450ms]
 ├── sub-agent:architect            [200ms]
 ├── sub-agent:coder                [400ms]
 │     ├── llm:gpt-4.1             [300ms]
 │     └── tool:file_write          [100ms]
 └── sub-agent:reviewer             [150ms]
```

Chaque span contient :
- **Durée** d'exécution
- **Inputs/outputs** de chaque agent
- **Erreurs** le cas échéant
- **Modèle LLM** et tokens utilisés
- **Outils** appelés

## Utilisation programmatique

```js
const { AgentTracer } = require("./observability/agent-tracer");
const tracer = new AgentTracer();

// Tracer un agent principal
await tracer.traceAgent("main", { input: query }, async (span) => {
  // Tracer un sous-agent
  await tracer.traceSubAgent("coder", { task: "Fix bug" }, async () => {
    // Tracer un appel LLM
    await tracer.traceLLMCall("gpt-4.1", { prompt }, async () => { ... });
    // Tracer un outil
    await tracer.traceToolCall("file_write", { input: data }, async () => { ... });
  });
});
```

## Prérequis

- **Docker Desktop** (pour Jaeger)
- **Node.js** (déjà installé)
- Dépendances npm (déjà installées dans `workspace/`)
