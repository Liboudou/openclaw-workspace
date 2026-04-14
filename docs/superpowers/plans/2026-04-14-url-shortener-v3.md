# URL Shortener V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the URL shortener from V1 (in-memory) to V3 with SQLite persistence, custom codes, click analytics, link expiration, bulk shortening, and link management.

**Architecture:** Express app with four modules — `db.ts` (SQLite via `better-sqlite3`), `validation.ts` (input validation), `routes.ts` (Express Router with 6 endpoints), `index.ts` (bootstrap). V1's `store.ts` is deleted. All state lives in a SQLite file at `data/urls.db`.

**Tech Stack:** TypeScript, Express, better-sqlite3, vitest (testing)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/store.ts` | Delete | Replaced by `db.ts` |
| `src/db.ts` | Create | SQLite init, CRUD operations, batch insert, pagination |
| `src/validation.ts` | Create | URL validation, code format validation, expiration parsing |
| `src/routes.ts` | Create | Express Router with all 6 route handlers |
| `src/index.ts` | Rewrite | Bootstrap: init DB, mount router, listen |
| `src/__tests__/validation.test.ts` | Create | Tests for validation helpers |
| `src/__tests__/db.test.ts` | Create | Tests for database operations |
| `src/__tests__/routes.test.ts` | Create | Integration tests for all endpoints |
| `package.json` | Modify | Add `better-sqlite3`, `vitest`, `supertest` |
| `tsconfig.json` | Keep | No changes needed |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `projects/url-shortener/package.json`

- [ ] **Step 1: Install production and dev dependencies**

```bash
cd projects/url-shortener
npm install better-sqlite3
npm install -D @types/better-sqlite3 vitest supertest @types/supertest
```

- [ ] **Step 2: Add test script to package.json**

Add to `scripts` in `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add data/ to .gitignore**

Create `projects/url-shortener/.gitignore`:
```
data/
```

- [ ] **Step 4: Commit**

```bash
git add projects/url-shortener/package.json projects/url-shortener/package-lock.json projects/url-shortener/.gitignore
git commit -m "feat(url-shortener): add better-sqlite3, vitest, supertest dependencies"
```

---

### Task 2: Validation Module

**Files:**
- Create: `projects/url-shortener/src/validation.ts`
- Create: `projects/url-shortener/src/__tests__/validation.test.ts`

- [ ] **Step 1: Write failing tests for validation helpers**

Create `src/__tests__/validation.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { isValidUrl, isValidCode, parseExpiration } from "../validation";

describe("isValidUrl", () => {
  it("accepts valid http URL", () => {
    expect(isValidUrl("https://example.com/path")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejects non-URL string", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });
});

describe("isValidCode", () => {
  it("accepts alphanumeric code", () => {
    expect(isValidCode("abc123")).toBe(true);
  });

  it("accepts code with hyphens", () => {
    expect(isValidCode("my-slug")).toBe(true);
  });

  it("rejects code shorter than 3 chars", () => {
    expect(isValidCode("ab")).toBe(false);
  });

  it("rejects code longer than 30 chars", () => {
    expect(isValidCode("a".repeat(31))).toBe(false);
  });

  it("rejects code with special characters", () => {
    expect(isValidCode("my_slug!")).toBe(false);
  });
});

describe("parseExpiration", () => {
  it("returns null expiresAt when neither param given", () => {
    const result = parseExpiration(undefined, undefined);
    expect(result).toEqual({ expiresAt: null });
  });

  it("returns error when both expiresIn and expiresAt given", () => {
    const result = parseExpiration(3600, "2030-01-01T00:00:00.000Z");
    expect(result.error).toBe("Cannot specify both expiresIn and expiresAt");
  });

  it("converts expiresIn seconds to ISO string", () => {
    const result = parseExpiration(3600, undefined);
    expect(result.error).toBeUndefined();
    expect(result.expiresAt).toBeTruthy();
    // The resulting time should be roughly 1 hour from now
    const diff = new Date(result.expiresAt!).getTime() - Date.now();
    expect(diff).toBeGreaterThan(3500_000);
    expect(diff).toBeLessThan(3700_000);
  });

  it("returns error for negative expiresIn", () => {
    const result = parseExpiration(-100, undefined);
    expect(result.error).toBe("Expiration must be in the future");
  });

  it("passes through valid future expiresAt", () => {
    const future = "2030-01-01T00:00:00.000Z";
    const result = parseExpiration(undefined, future);
    expect(result).toEqual({ expiresAt: future });
  });

  it("returns error for past expiresAt", () => {
    const past = "2020-01-01T00:00:00.000Z";
    const result = parseExpiration(undefined, past);
    expect(result.error).toBe("Expiration must be in the future");
  });

  it("returns error for invalid expiresAt format", () => {
    const result = parseExpiration(undefined, "not-a-date");
    expect(result.error).toBe("Expiration must be in the future");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd projects/url-shortener && npx vitest run src/__tests__/validation.test.ts
```

Expected: FAIL — module `../validation` not found.

- [ ] **Step 3: Implement validation module**

Create `src/validation.ts`:
```typescript
const CODE_REGEX = /^[a-zA-Z0-9-]{3,30}$/;

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidCode(code: string): boolean {
  return CODE_REGEX.test(code);
}

export function parseExpiration(
  expiresIn?: number,
  expiresAt?: string
): { expiresAt: string | null; error?: string } {
  if (expiresIn !== undefined && expiresAt !== undefined) {
    return { expiresAt: null, error: "Cannot specify both expiresIn and expiresAt" };
  }

  if (expiresIn !== undefined) {
    if (typeof expiresIn !== "number" || expiresIn <= 0) {
      return { expiresAt: null, error: "Expiration must be in the future" };
    }
    const date = new Date(Date.now() + expiresIn * 1000);
    return { expiresAt: date.toISOString() };
  }

  if (expiresAt !== undefined) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      return { expiresAt: null, error: "Expiration must be in the future" };
    }
    return { expiresAt: expiresAt };
  }

  return { expiresAt: null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd projects/url-shortener && npx vitest run src/__tests__/validation.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/url-shortener/src/validation.ts projects/url-shortener/src/__tests__/validation.test.ts
git commit -m "feat(url-shortener): add validation module with tests"
```

---

### Task 3: Database Module

**Files:**
- Create: `projects/url-shortener/src/db.ts`
- Create: `projects/url-shortener/src/__tests__/db.test.ts`

- [ ] **Step 1: Write failing tests for database operations**

Create `src/__tests__/db.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { initDb, insertUrl, findUrl, incrementClicks, codeExists, deleteUrl, listUrls } from "../db";

beforeEach(() => {
  // Re-initialize with in-memory database for each test
  initDb(":memory:");
});

describe("insertUrl and findUrl", () => {
  it("inserts and retrieves a URL", () => {
    insertUrl("abc123", "https://example.com");
    const record = findUrl("abc123");
    expect(record).toBeDefined();
    expect(record!.url).toBe("https://example.com");
    expect(record!.code).toBe("abc123");
    expect(record!.clicks).toBe(0);
    expect(record!.expires_at).toBeNull();
  });

  it("inserts URL with expiration", () => {
    const exp = "2030-01-01T00:00:00.000Z";
    insertUrl("abc123", "https://example.com", exp);
    const record = findUrl("abc123");
    expect(record!.expires_at).toBe(exp);
  });

  it("returns undefined for non-existent code", () => {
    expect(findUrl("nope")).toBeUndefined();
  });
});

describe("codeExists", () => {
  it("returns false for non-existent code", () => {
    expect(codeExists("nope")).toBe(false);
  });

  it("returns true for existing code", () => {
    insertUrl("abc123", "https://example.com");
    expect(codeExists("abc123")).toBe(true);
  });
});

describe("incrementClicks", () => {
  it("increments click count and sets last_clicked_at", () => {
    insertUrl("abc123", "https://example.com");
    incrementClicks("abc123");
    const record = findUrl("abc123");
    expect(record!.clicks).toBe(1);
    expect(record!.last_clicked_at).toBeTruthy();
  });

  it("increments multiple times", () => {
    insertUrl("abc123", "https://example.com");
    incrementClicks("abc123");
    incrementClicks("abc123");
    incrementClicks("abc123");
    const record = findUrl("abc123");
    expect(record!.clicks).toBe(3);
  });
});

describe("deleteUrl", () => {
  it("deletes existing URL and returns true", () => {
    insertUrl("abc123", "https://example.com");
    expect(deleteUrl("abc123")).toBe(true);
    expect(findUrl("abc123")).toBeUndefined();
  });

  it("returns false for non-existent code", () => {
    expect(deleteUrl("nope")).toBe(false);
  });
});

describe("listUrls", () => {
  it("returns empty list when no URLs exist", () => {
    const result = listUrls();
    expect(result.urls).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.total).toBe(0);
  });

  it("returns URLs ordered by created_at DESC", () => {
    insertUrl("first", "https://example.com/1");
    insertUrl("second", "https://example.com/2");
    insertUrl("third", "https://example.com/3");
    const result = listUrls();
    expect(result.urls).toHaveLength(3);
    expect(result.urls[0].code).toBe("third");
    expect(result.urls[2].code).toBe("first");
    expect(result.total).toBe(3);
  });

  it("paginates with limit and cursor", () => {
    insertUrl("aaa", "https://example.com/1");
    insertUrl("bbb", "https://example.com/2");
    insertUrl("ccc", "https://example.com/3");

    const page1 = listUrls(undefined, 2);
    expect(page1.urls).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = listUrls(page1.nextCursor!, 2);
    expect(page2.urls).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd projects/url-shortener && npx vitest run src/__tests__/db.test.ts
```

Expected: FAIL — module `../db` not found.

- [ ] **Step 3: Implement database module**

Create `src/db.ts`:
```typescript
import Database from "better-sqlite3";
import crypto from "crypto";

let db: Database.Database;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export interface UrlRecord {
  code: string;
  url: string;
  clicks: number;
  created_at: string;
  last_clicked_at: string | null;
  expires_at: string | null;
}

export function initDb(path?: string): void {
  db = new Database(path ?? "./data/urls.db");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      code TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_clicked_at TEXT,
      expires_at TEXT
    )
  `);
}

export function generateCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += BASE62[bytes[i] % 62];
  }
  return code;
}

export function insertUrl(code: string, url: string, expiresAt?: string | null): void {
  const stmt = db.prepare(
    "INSERT INTO urls (code, url, created_at, expires_at) VALUES (?, ?, ?, ?)"
  );
  stmt.run(code, url, new Date().toISOString(), expiresAt ?? null);
}

export function findUrl(code: string): UrlRecord | undefined {
  const stmt = db.prepare("SELECT * FROM urls WHERE code = ?");
  return stmt.get(code) as UrlRecord | undefined;
}

export function incrementClicks(code: string): void {
  const stmt = db.prepare(
    "UPDATE urls SET clicks = clicks + 1, last_clicked_at = ? WHERE code = ?"
  );
  stmt.run(new Date().toISOString(), code);
}

export function codeExists(code: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM urls WHERE code = ?");
  return stmt.get(code) !== undefined;
}

export function deleteUrl(code: string): boolean {
  const stmt = db.prepare("DELETE FROM urls WHERE code = ?");
  const result = stmt.run(code);
  return result.changes > 0;
}

export function listUrls(
  cursor?: string,
  limit = 20
): { urls: UrlRecord[]; nextCursor: string | null; total: number } {
  const totalStmt = db.prepare("SELECT COUNT(*) as count FROM urls");
  const { count: total } = totalStmt.get() as { count: number };

  let urls: UrlRecord[];
  if (cursor) {
    const cursorRow = db.prepare("SELECT created_at FROM urls WHERE code = ?").get(cursor) as
      | { created_at: string }
      | undefined;
    if (!cursorRow) {
      urls = [];
    } else {
      const stmt = db.prepare(
        `SELECT * FROM urls
         WHERE created_at < ? OR (created_at = ? AND code < ?)
         ORDER BY created_at DESC, code DESC
         LIMIT ?`
      );
      urls = stmt.all(cursorRow.created_at, cursorRow.created_at, cursor, limit + 1) as UrlRecord[];
    }
  } else {
    const stmt = db.prepare("SELECT * FROM urls ORDER BY created_at DESC, code DESC LIMIT ?");
    urls = stmt.all(limit + 1) as UrlRecord[];
  }

  let nextCursor: string | null = null;
  if (urls.length > limit) {
    urls = urls.slice(0, limit);
    nextCursor = urls[urls.length - 1].code;
  }

  return { urls, nextCursor, total };
}

export function getDb(): Database.Database {
  return db;
}
```

- [ ] **Step 4: Create data directory setup**

The `initDb()` function uses `./data/urls.db`. For production, ensure the directory exists. Add to `index.ts` later. For tests, we use `:memory:`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd projects/url-shortener && npx vitest run src/__tests__/db.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add projects/url-shortener/src/db.ts projects/url-shortener/src/__tests__/db.test.ts
git commit -m "feat(url-shortener): add SQLite database module with tests"
```

---

### Task 4: Routes Module

**Files:**
- Create: `projects/url-shortener/src/routes.ts`
- Create: `projects/url-shortener/src/__tests__/routes.test.ts`

- [ ] **Step 1: Write failing integration tests for all endpoints**

Create `src/__tests__/routes.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { initDb } from "../db";
import { createRouter } from "../routes";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(createRouter(3000));
  return app;
}

beforeEach(() => {
  initDb(":memory:");
});

describe("POST /shorten", () => {
  it("shortens a valid URL", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com" });
    expect(res.status).toBe(201);
    expect(res.body.shortUrl).toContain("http://localhost:3000/");
    expect(res.body.code).toBeTruthy();
    expect(res.body.expiresAt).toBeNull();
  });

  it("accepts a custom code", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", code: "my-link" });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe("my-link");
  });

  it("rejects duplicate custom code with 409", async () => {
    const app = createApp();
    await request(app).post("/shorten").send({ url: "https://example.com", code: "taken" });
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/other", code: "taken" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Code already in use");
  });

  it("rejects invalid URL with 400", async () => {
    const app = createApp();
    const res = await request(app).post("/shorten").send({ url: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid code format with 400", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", code: "ab" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid code format");
  });

  it("accepts expiresIn and sets expiresAt", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", expiresIn: 3600 });
    expect(res.status).toBe(201);
    expect(res.body.expiresAt).toBeTruthy();
  });

  it("accepts expiresAt", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", expiresAt: "2030-01-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(res.body.expiresAt).toBe("2030-01-01T00:00:00.000Z");
  });

  it("rejects both expiresIn and expiresAt", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", expiresIn: 3600, expiresAt: "2030-01-01T00:00:00.000Z" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot specify both expiresIn and expiresAt");
  });
});

describe("GET /:code", () => {
  it("redirects to the original URL", async () => {
    const app = createApp();
    const shorten = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com" });
    const code = shorten.body.code;

    const res = await request(app).get(`/${code}`).redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com");
  });

  it("returns 404 for unknown code", async () => {
    const app = createApp();
    const res = await request(app).get("/unknown");
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired link", async () => {
    const app = createApp();
    // Create a link that expires 1 second from now
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", expiresIn: 1 });
    const code = res.body.code;

    // Wait for expiration
    await new Promise((r) => setTimeout(r, 1100));

    const redirect = await request(app).get(`/${code}`);
    expect(redirect.status).toBe(410);
    expect(redirect.body.error).toBe("Link has expired");
  });
});

describe("GET /:code/stats", () => {
  it("returns stats for a link", async () => {
    const app = createApp();
    const shorten = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com" });
    const code = shorten.body.code;

    // Click once
    await request(app).get(`/${code}`).redirects(0);

    const res = await request(app).get(`/${code}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(code);
    expect(res.body.url).toBe("https://example.com");
    expect(res.body.clicks).toBe(1);
    expect(res.body.createdAt).toBeTruthy();
    expect(res.body.expired).toBe(false);
  });

  it("returns 404 for unknown code", async () => {
    const app = createApp();
    const res = await request(app).get("/unknown/stats");
    expect(res.status).toBe(404);
  });

  it("shows expired status for expired links", async () => {
    const app = createApp();
    const shorten = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com", expiresIn: 1 });
    const code = shorten.body.code;

    await new Promise((r) => setTimeout(r, 1100));

    const res = await request(app).get(`/${code}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.expired).toBe(true);
  });
});

describe("POST /shorten/bulk", () => {
  it("shortens multiple URLs", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten/bulk")
      .send({
        urls: [
          { url: "https://example.com/a" },
          { url: "https://example.com/b" },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.errors).toHaveLength(0);
  });

  it("returns 207 on partial failure", async () => {
    const app = createApp();
    // Create a code first
    await request(app).post("/shorten").send({ url: "https://example.com", code: "taken" });

    const res = await request(app)
      .post("/shorten/bulk")
      .send({
        urls: [
          { url: "https://example.com/a" },
          { url: "https://example.com/b", code: "taken" },
        ],
      });
    expect(res.status).toBe(207);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].index).toBe(1);
  });

  it("rejects empty array", async () => {
    const app = createApp();
    const res = await request(app).post("/shorten/bulk").send({ urls: [] });
    expect(res.status).toBe(400);
  });

  it("rejects missing urls field", async () => {
    const app = createApp();
    const res = await request(app).post("/shorten/bulk").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /links", () => {
  it("returns empty list", async () => {
    const app = createApp();
    const res = await request(app).get("/links");
    expect(res.status).toBe(200);
    expect(res.body.links).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns links with pagination", async () => {
    const app = createApp();
    for (let i = 0; i < 3; i++) {
      await request(app).post("/shorten").send({ url: `https://example.com/${i}` });
    }

    const res = await request(app).get("/links?limit=2");
    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(2);
    expect(res.body.nextCursor).toBeTruthy();
    expect(res.body.total).toBe(3);

    const page2 = await request(app).get(`/links?limit=2&cursor=${res.body.nextCursor}`);
    expect(page2.body.links).toHaveLength(1);
    expect(page2.body.nextCursor).toBeNull();
  });
});

describe("DELETE /:code", () => {
  it("deletes an existing link", async () => {
    const app = createApp();
    const shorten = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com" });
    const code = shorten.body.code;

    const res = await request(app).delete(`/${code}`);
    expect(res.status).toBe(204);

    // Verify it's gone
    const get = await request(app).get(`/${code}`);
    expect(get.status).toBe(404);
  });

  it("returns 404 for non-existent code", async () => {
    const app = createApp();
    const res = await request(app).delete("/unknown");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd projects/url-shortener && npx vitest run src/__tests__/routes.test.ts
```

Expected: FAIL — module `../routes` not found.

- [ ] **Step 3: Implement routes module**

Create `src/routes.ts`:
```typescript
import { Router, Request, Response } from "express";
import {
  insertUrl,
  findUrl,
  incrementClicks,
  codeExists,
  deleteUrl,
  listUrls,
  generateCode,
  getDb,
} from "./db";
import { isValidUrl, isValidCode, parseExpiration } from "./validation";

export function createRouter(port: number | string): Router {
  const router = Router();

  // POST /shorten/bulk — must be before /shorten to avoid param conflict
  router.post("/shorten/bulk", (req: Request, res: Response) => {
    const { urls } = req.body ?? {};

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: "urls must be a non-empty array" });
      return;
    }

    if (urls.length > 100) {
      res.status(400).json({ error: "Maximum 100 URLs per request" });
      return;
    }

    const results: Array<{ shortUrl: string; code: string; expiresAt: string | null }> = [];
    const errors: Array<{ index: number; error: string }> = [];

    const transaction = getDb().transaction(() => {
      for (let i = 0; i < urls.length; i++) {
        const entry = urls[i];
        const { url, code: customCode, expiresIn, expiresAt } = entry ?? {};

        if (!url || typeof url !== "string" || !isValidUrl(url)) {
          errors.push({ index: i, error: "Invalid or missing URL" });
          continue;
        }

        if (customCode !== undefined && !isValidCode(customCode)) {
          errors.push({ index: i, error: "Invalid code format" });
          continue;
        }

        const expResult = parseExpiration(expiresIn, expiresAt);
        if (expResult.error) {
          errors.push({ index: i, error: expResult.error });
          continue;
        }

        let code: string;
        if (customCode) {
          if (codeExists(customCode)) {
            errors.push({ index: i, error: "Code already in use" });
            continue;
          }
          code = customCode;
        } else {
          code = generateCode();
          while (codeExists(code)) {
            code = generateCode();
          }
        }

        insertUrl(code, url, expResult.expiresAt);
        results.push({
          shortUrl: `http://localhost:${port}/${code}`,
          code,
          expiresAt: expResult.expiresAt,
        });
      }
    });

    transaction();

    const status = errors.length === 0 ? 201 : 207;
    res.status(status).json({ results, errors });
  });

  // POST /shorten
  router.post("/shorten", (req: Request, res: Response) => {
    const { url, code: customCode, expiresIn, expiresAt } = req.body ?? {};

    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      res.status(400).json({ error: "Invalid or missing URL" });
      return;
    }

    if (customCode !== undefined && !isValidCode(customCode)) {
      res.status(400).json({ error: "Invalid code format" });
      return;
    }

    const expResult = parseExpiration(expiresIn, expiresAt);
    if (expResult.error) {
      res.status(400).json({ error: expResult.error });
      return;
    }

    let code: string;
    if (customCode) {
      if (codeExists(customCode)) {
        res.status(409).json({ error: "Code already in use" });
        return;
      }
      code = customCode;
    } else {
      code = generateCode();
      while (codeExists(code)) {
        code = generateCode();
      }
    }

    insertUrl(code, url, expResult.expiresAt);
    res.status(201).json({
      shortUrl: `http://localhost:${port}/${code}`,
      code,
      expiresAt: expResult.expiresAt,
    });
  });

  // GET /links
  router.get("/links", (req: Request, res: Response) => {
    const cursor = req.query.cursor as string | undefined;
    let limit = parseInt(req.query.limit as string, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const result = listUrls(cursor, limit);

    const links = result.urls.map((u) => ({
      code: u.code,
      url: u.url,
      clicks: u.clicks,
      createdAt: u.created_at,
      expiresAt: u.expires_at,
      expired: u.expires_at ? new Date(u.expires_at).getTime() <= Date.now() : false,
    }));

    res.json({ links, nextCursor: result.nextCursor, total: result.total });
  });

  // GET /:code/stats — must be before /:code
  router.get("/:code/stats", (req: Request, res: Response) => {
    const record = findUrl(req.params.code);
    if (!record) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      code: record.code,
      url: record.url,
      clicks: record.clicks,
      createdAt: record.created_at,
      lastClickedAt: record.last_clicked_at,
      expiresAt: record.expires_at,
      expired: record.expires_at ? new Date(record.expires_at).getTime() <= Date.now() : false,
    });
  });

  // GET /:code
  router.get("/:code", (req: Request, res: Response) => {
    const record = findUrl(req.params.code);
    if (!record) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
      res.status(410).json({ error: "Link has expired" });
      return;
    }

    incrementClicks(record.code);
    res.redirect(302, record.url);
  });

  // DELETE /:code
  router.delete("/:code", (req: Request, res: Response) => {
    const deleted = deleteUrl(req.params.code);
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd projects/url-shortener && npx vitest run
```

Expected: All tests across all 3 test files PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/url-shortener/src/routes.ts projects/url-shortener/src/__tests__/routes.test.ts
git commit -m "feat(url-shortener): add routes module with integration tests"
```

---

### Task 5: Bootstrap and Cleanup

**Files:**
- Rewrite: `projects/url-shortener/src/index.ts`
- Delete: `projects/url-shortener/src/store.ts`

- [ ] **Step 1: Rewrite index.ts**

Replace `src/index.ts` with:
```typescript
import fs from "fs";
import express from "express";
import { initDb } from "./db";
import { createRouter } from "./routes";

const PORT = process.env.PORT || 3000;

// Ensure data directory exists
fs.mkdirSync("./data", { recursive: true });

initDb();

const app = express();
app.use(express.json());
app.use(createRouter(PORT));

app.listen(PORT, () => {
  console.log(`URL shortener V3 running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Delete store.ts**

```bash
rm projects/url-shortener/src/store.ts
```

- [ ] **Step 3: Run all tests to verify nothing broke**

```bash
cd projects/url-shortener && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Verify the app compiles**

```bash
cd projects/url-shortener && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add projects/url-shortener/src/index.ts
git rm projects/url-shortener/src/store.ts
git commit -m "feat(url-shortener): rewrite bootstrap for V3, remove in-memory store"
```

---

### Task 6: Manual Smoke Test

- [ ] **Step 1: Start the server**

```bash
cd projects/url-shortener && npx ts-node src/index.ts
```

Expected: `URL shortener V3 running on http://localhost:3000`

- [ ] **Step 2: Test POST /shorten**

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "expiresIn": 3600}'
```

Expected: 201 with `shortUrl`, `code`, and `expiresAt` fields.

- [ ] **Step 3: Test GET /:code (redirect)**

Use the code from step 2:
```bash
curl -v http://localhost:3000/<code>
```

Expected: 302 redirect to `https://example.com`.

- [ ] **Step 4: Test GET /:code/stats**

```bash
curl http://localhost:3000/<code>/stats
```

Expected: 200 with clicks=1, expired=false.

- [ ] **Step 5: Test POST /shorten/bulk**

```bash
curl -X POST http://localhost:3000/shorten/bulk \
  -H "Content-Type: application/json" \
  -d '{"urls": [{"url": "https://a.com"}, {"url": "https://b.com", "code": "custom"}]}'
```

Expected: 201 with 2 results.

- [ ] **Step 6: Test GET /links**

```bash
curl http://localhost:3000/links?limit=2
```

Expected: 200 with paginated links list.

- [ ] **Step 7: Test DELETE /:code**

```bash
curl -X DELETE http://localhost:3000/custom
```

Expected: 204 no content.
