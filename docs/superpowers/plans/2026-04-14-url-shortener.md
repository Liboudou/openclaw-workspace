# URL Shortener API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal URL shortener API with two endpoints — shorten a URL and redirect by code.

**Architecture:** Express server with two routes. An in-memory Map stores `code → url` mappings. A helper module handles code generation via `crypto.randomBytes` and store operations.

**Tech Stack:** TypeScript, Express, Node.js `crypto`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `projects/url-shortener/package.json` | Dependencies (express, typescript, ts-node, @types/*) and scripts |
| `projects/url-shortener/tsconfig.json` | TypeScript compiler config |
| `projects/url-shortener/src/store.ts` | In-memory Map, `generateCode()`, `saveUrl()`, `getUrl()` |
| `projects/url-shortener/src/index.ts` | Express app, routes, server start |

---

### Task 1: Project scaffolding

**Files:**
- Create: `projects/url-shortener/package.json`
- Create: `projects/url-shortener/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "url-shortener",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "ts-node": "^10.9.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd projects/url-shortener && npm install`
Expected: `node_modules/` created, `package-lock.json` generated

- [ ] **Step 4: Commit**

```bash
git add projects/url-shortener/package.json projects/url-shortener/package-lock.json projects/url-shortener/tsconfig.json
git commit -m "feat(url-shortener): scaffold project with TypeScript and Express"
```

---

### Task 2: In-memory store and code generation

**Files:**
- Create: `projects/url-shortener/src/store.ts`

- [ ] **Step 1: Write store.ts**

```typescript
import crypto from "crypto";

const store = new Map<string, string>();

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += BASE62[bytes[i] % 62];
  }
  return code;
}

export function saveUrl(url: string): string {
  let code = generateCode();
  while (store.has(code)) {
    code = generateCode();
  }
  store.set(code, url);
  return code;
}

export function getUrl(code: string): string | undefined {
  return store.get(code);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd projects/url-shortener && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add projects/url-shortener/src/store.ts
git commit -m "feat(url-shortener): add in-memory store with code generation"
```

---

### Task 3: Express app and routes

**Files:**
- Create: `projects/url-shortener/src/index.ts`

- [ ] **Step 1: Write index.ts**

```typescript
import express from "express";
import { saveUrl, getUrl } from "./store";

const app = express();
app.use(express.json());

app.post("/shorten", (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Invalid or missing URL" });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid or missing URL" });
    return;
  }

  const code = saveUrl(url);
  const port = process.env.PORT || 3000;
  res.status(201).json({ shortUrl: `http://localhost:${port}/${code}` });
});

app.get("/:code", (req, res) => {
  const url = getUrl(req.params.code);
  if (!url) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.redirect(302, url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL shortener running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Verify it compiles**

Run: `cd projects/url-shortener && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Smoke test**

Run: `cd projects/url-shortener && npx ts-node src/index.ts &`
Then:
```bash
curl -s -X POST http://localhost:3000/shorten -H "Content-Type: application/json" -d '{"url":"https://example.com"}' | head -1
```
Expected: JSON response with `shortUrl` field containing a 6-char code

Kill the server after testing.

- [ ] **Step 4: Commit**

```bash
git add projects/url-shortener/src/index.ts
git commit -m "feat(url-shortener): add Express routes for shorten and redirect"
```
