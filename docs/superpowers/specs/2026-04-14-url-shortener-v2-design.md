# URL Shortener API V2 — Design Spec

**Date:** 2026-04-14
**Location:** `projects/url-shortener/`
**Replaces:** V1 (in-memory store, no analytics, no custom codes)

## Overview

V2 upgrades the URL shortener from a demo to a usable service. Three additions over V1:

1. **Persistent storage** — SQLite via `better-sqlite3` replaces the in-memory Map
2. **Custom short codes** — users can optionally choose their own slug
3. **Click analytics** — track click count and last-clicked timestamp per link

Everything else stays minimal: no auth, no rate limiting, no frontend.

## Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express
- **Storage:** SQLite via `better-sqlite3` (synchronous, zero-config, single-file DB)
- **Code generation:** `crypto.randomBytes` base62-encoded (unchanged from V1)

## Data Model

Single table `urls`:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `code` | TEXT | PRIMARY KEY | 6-char auto-generated or user-chosen |
| `url` | TEXT | NOT NULL | Original long URL |
| `clicks` | INTEGER | NOT NULL DEFAULT 0 | Incremented on each redirect |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `last_clicked_at` | TEXT | | Nullable, updated on redirect |

The table is created on startup if it doesn't exist (`CREATE TABLE IF NOT EXISTS`).

## Endpoints

### `POST /shorten`

- **Body:** `{ "url": "https://example.com/long-path", "code": "my-slug" }`
  - `url` — required, must be a valid URL (validated with `new URL()`)
  - `code` — optional custom short code
- **Custom code validation:** 3-30 characters, alphanumeric plus hyphens (`/^[a-zA-Z0-9-]{3,30}$/`)
- **Behavior:**
  - If `code` is provided and valid, use it. If it already exists, return 409.
  - If `code` is not provided, auto-generate a 6-char base62 code (retry on collision).
  - Insert into SQLite, return the short URL.
- **Success response (201):**
  ```json
  { "shortUrl": "http://localhost:3000/my-slug", "code": "my-slug" }
  ```
- **Error responses:**
  - 400: `{ "error": "Invalid or missing URL" }` — bad/missing URL
  - 400: `{ "error": "Invalid code format" }` — custom code fails regex
  - 409: `{ "error": "Code already in use" }` — custom code collision

### `GET /:code`

- **Behavior:** Look up the code in SQLite. If found, increment `clicks`, update `last_clicked_at`, respond with 302 redirect.
- **Error response (404):**
  ```json
  { "error": "Not found" }
  ```

### `GET /:code/stats`

- **Behavior:** Look up the code in SQLite. Return analytics without redirecting.
- **Success response (200):**
  ```json
  {
    "code": "my-slug",
    "url": "https://example.com/long-path",
    "clicks": 42,
    "createdAt": "2026-04-14T12:00:00.000Z",
    "lastClickedAt": "2026-04-14T15:30:00.000Z"
  }
  ```
- **Error response (404):**
  ```json
  { "error": "Not found" }
  ```

## Project Structure

```
projects/url-shortener/
  src/
    index.ts          — Express app bootstrap and listen
    routes.ts         — Route handlers (shorten, redirect, stats)
    db.ts             — SQLite initialization and query functions
    validation.ts     — URL and custom code validation helpers
  data/
    urls.db           — SQLite database file (gitignored)
  package.json
  tsconfig.json
```

## Module Responsibilities

### `db.ts`
- `initDb()` — open/create the SQLite database, run `CREATE TABLE IF NOT EXISTS`
- `insertUrl(code: string, url: string): void` — insert a new shortened URL
- `findUrl(code: string): UrlRecord | undefined` — look up by code
- `incrementClicks(code: string): void` — bump clicks + update last_clicked_at
- `codeExists(code: string): boolean` — check if a code is taken

### `validation.ts`
- `isValidUrl(url: string): boolean` — `new URL()` constructor check
- `isValidCode(code: string): boolean` — regex `/^[a-zA-Z0-9-]{3,30}$/`

### `routes.ts`
- Defines the three route handlers, calls into `db.ts` and `validation.ts`
- Exported as an Express Router

### `index.ts`
- Calls `initDb()`, mounts the router, starts listening
- Reads `PORT` from env (default 3000)

## Key Decisions

- **SQLite over alternatives:** Zero config, no external service, synchronous API via `better-sqlite3` fits Express's request/response model perfectly. Single file, easy to back up or reset.
- **DB location:** `./data/urls.db` relative to project root. The `data/` directory is created by `initDb()` if missing and should be gitignored.
- **Custom code regex:** `^[a-zA-Z0-9-]{3,30}$` — restrictive enough to be URL-safe, permissive enough to be useful. Min 3 chars avoids collisions with potential future routes.
- **409 for code collisions:** Standard HTTP semantics for "this resource identifier is taken."
- **Click tracking is inline:** The redirect handler runs an `UPDATE` before responding. `better-sqlite3` is synchronous so this adds negligible latency.
- **Redirect type stays 302:** Temporary redirect so browsers don't cache and analytics stay accurate.
- **No auth, no rate limiting, no tests in scope:** Intentionally minimal. Tests can be a follow-up.
- **Stats endpoint path:** `GET /:code/stats` — nested under the code. In `routes.ts`, register `/:code/stats` before `/:code` so Express matches the more specific path first and doesn't treat "stats" as a code lookup.

## Migration from V1

V2 replaces V1's files entirely. The in-memory `store.ts` is removed. `index.ts` is rewritten. New files `db.ts`, `routes.ts`, and `validation.ts` are added. New dependency `better-sqlite3` (plus `@types/better-sqlite3`) is installed.
