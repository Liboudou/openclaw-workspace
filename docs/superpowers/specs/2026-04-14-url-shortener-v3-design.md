# URL Shortener API V3 — Design Spec

**Date:** 2026-04-14
**Location:** `projects/url-shortener/`
**Replaces:** V2 (SQLite, custom codes, click analytics)

## Overview

V3 extends V2 with three features that make the service practically usable:

1. **Link expiration** — optional `expiresIn` parameter (seconds) or `expiresAt` (ISO timestamp); expired links return 410 Gone
2. **Bulk shortening** — `POST /shorten/bulk` accepts an array of URLs, returns results for each
3. **Link management** — `GET /links` lists all links with cursor pagination; `DELETE /:code` removes a link

Everything else carries forward from V2: SQLite via `better-sqlite3`, custom codes, click analytics, no auth, no rate limiting.

## Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express
- **Storage:** SQLite via `better-sqlite3`
- **Code generation:** `crypto.randomBytes` base62-encoded (unchanged)

## Data Model

Single table `urls` (evolved from V2):

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `code` | TEXT | PRIMARY KEY | 6-char auto-generated or user-chosen |
| `url` | TEXT | NOT NULL | Original long URL |
| `clicks` | INTEGER | NOT NULL DEFAULT 0 | Incremented on each redirect |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `last_clicked_at` | TEXT | | Nullable, updated on redirect |
| `expires_at` | TEXT | | Nullable, ISO 8601. Null = never expires |

**New in V3:** `expires_at` column. No index needed at this scale.

## Endpoints

### `POST /shorten` (updated from V2)

- **Body:**
  ```json
  {
    "url": "https://example.com/long-path",
    "code": "my-slug",
    "expiresIn": 3600,
    "expiresAt": "2026-05-01T00:00:00.000Z"
  }
  ```
  - `url` — required, validated with `new URL()`
  - `code` — optional custom code, validated with `/^[a-zA-Z0-9-]{3,30}$/`
  - `expiresIn` — optional, seconds from now. Positive integer.
  - `expiresAt` — optional, ISO 8601 timestamp in the future.
  - If both `expiresIn` and `expiresAt` are provided, return 400.
- **Success response (201):**
  ```json
  {
    "shortUrl": "http://localhost:3000/my-slug",
    "code": "my-slug",
    "expiresAt": "2026-04-14T13:00:00.000Z"
  }
  ```
  `expiresAt` is null if no expiration was set.
- **Error responses:**
  - 400: `{ "error": "Invalid or missing URL" }`
  - 400: `{ "error": "Invalid code format" }`
  - 400: `{ "error": "Cannot specify both expiresIn and expiresAt" }`
  - 400: `{ "error": "Expiration must be in the future" }`
  - 409: `{ "error": "Code already in use" }`

### `POST /shorten/bulk` (new)

- **Body:**
  ```json
  {
    "urls": [
      { "url": "https://example.com/a" },
      { "url": "https://example.com/b", "code": "custom", "expiresIn": 7200 }
    ]
  }
  ```
  - `urls` — required array, max 100 items. Each item has the same shape as `POST /shorten` body.
- **Behavior:** Process each entry independently. Failures for one entry don't block others. Uses a single SQLite transaction for atomicity.
- **Success response (201):**
  ```json
  {
    "results": [
      { "shortUrl": "http://localhost:3000/aB3xYz", "code": "aB3xYz", "expiresAt": null },
      { "shortUrl": "http://localhost:3000/custom", "code": "custom", "expiresAt": "2026-04-14T14:00:00.000Z" }
    ],
    "errors": []
  }
  ```
- **Partial failure response (207):**
  ```json
  {
    "results": [
      { "shortUrl": "http://localhost:3000/aB3xYz", "code": "aB3xYz", "expiresAt": null }
    ],
    "errors": [
      { "index": 1, "error": "Code already in use" }
    ]
  }
  ```
- **Error responses:**
  - 400: `{ "error": "urls must be a non-empty array" }`
  - 400: `{ "error": "Maximum 100 URLs per request" }`

### `GET /:code` (updated from V2)

- **Behavior:** Look up code. If the link has expired (`expires_at` is in the past), return 410. Otherwise, increment clicks, update `last_clicked_at`, redirect 302.
- **Error responses:**
  - 404: `{ "error": "Not found" }`
  - 410: `{ "error": "Link has expired" }`

### `GET /:code/stats` (updated from V2)

- **Behavior:** Look up code. Return analytics including expiration info. Works even for expired links.
- **Success response (200):**
  ```json
  {
    "code": "my-slug",
    "url": "https://example.com/long-path",
    "clicks": 42,
    "createdAt": "2026-04-14T12:00:00.000Z",
    "lastClickedAt": "2026-04-14T15:30:00.000Z",
    "expiresAt": "2026-05-01T00:00:00.000Z",
    "expired": false
  }
  ```
- **Error response (404):** `{ "error": "Not found" }`

### `GET /links` (new)

- **Query params:**
  - `cursor` — optional, the `code` of the last item from previous page
  - `limit` — optional, default 20, max 100
- **Behavior:** Returns links ordered by `created_at DESC`. Cursor-based pagination using `code` as cursor.
- **Success response (200):**
  ```json
  {
    "links": [
      {
        "code": "aB3xYz",
        "url": "https://example.com/a",
        "clicks": 5,
        "createdAt": "2026-04-14T12:00:00.000Z",
        "expiresAt": null,
        "expired": false
      }
    ],
    "nextCursor": "xY9kLm",
    "total": 42
  }
  ```
  `nextCursor` is null when there are no more results.

### `DELETE /:code` (new)

- **Behavior:** Delete the link from the database.
- **Success response (204):** No body.
- **Error response (404):** `{ "error": "Not found" }`

## Route Registration Order

In `routes.ts`, register routes in this order to avoid Express param conflicts:
1. `POST /shorten/bulk`
2. `POST /shorten`
3. `GET /links`
4. `GET /:code/stats`
5. `GET /:code`
6. `DELETE /:code`

## Project Structure

```
projects/url-shortener/
  src/
    index.ts          — Express app bootstrap and listen
    routes.ts         — Route handlers (all endpoints)
    db.ts             — SQLite initialization and query functions
    validation.ts     — URL, code, and expiration validation helpers
  data/
    urls.db           — SQLite database file (gitignored)
  package.json
  tsconfig.json
```

## Module Responsibilities

### `db.ts`
- `initDb()` — open/create SQLite database, run `CREATE TABLE IF NOT EXISTS` with the V3 schema
- `insertUrl(code, url, expiresAt?): void` — insert a shortened URL
- `insertUrlsBatch(entries): { results, errors }` — batch insert in a transaction
- `findUrl(code): UrlRecord | undefined` — look up by code
- `incrementClicks(code): void` — bump clicks + update last_clicked_at
- `codeExists(code): boolean` — check if a code is taken
- `deleteUrl(code): boolean` — delete by code, return true if existed
- `listUrls(cursor?, limit?): { urls, nextCursor, total }` — paginated listing

### `validation.ts`
- `isValidUrl(url): boolean` — `new URL()` constructor check
- `isValidCode(code): boolean` — regex `/^[a-zA-Z0-9-]{3,30}$/`
- `parseExpiration(expiresIn?, expiresAt?): { expiresAt: string | null, error?: string }` — validates and resolves expiration to ISO string or null

### `routes.ts`
- Defines all six route handlers, calls into `db.ts` and `validation.ts`
- Exported as an Express Router

### `index.ts`
- Calls `initDb()`, mounts the router, starts listening
- Reads `PORT` from env (default 3000)

## Key Decisions

- **Expiration check is at read time:** The redirect handler checks `expires_at` against `Date.now()`. No background cleanup job — expired rows remain in the DB until explicitly deleted. This is simpler and sufficient at this scale.
- **Bulk uses a transaction:** All inserts in `POST /shorten/bulk` run in one `better-sqlite3` transaction for performance. Individual failures are tracked per-entry and returned in `errors`.
- **207 for partial failure:** Standard HTTP multi-status. If all succeed, 201. If some fail, 207. If the request itself is malformed, 400.
- **Cursor pagination over offset:** Cursor-based pagination (keyed on `created_at` + `code`) is more stable than offset-based when links are being added/deleted.
- **Stats work on expired links:** You can still see analytics for expired links. Only the redirect is blocked.
- **No cleanup job:** Expired links stay in the DB. A future version could add a cleanup endpoint or cron, but YAGNI for now.
- **No auth:** Still no auth. All links are globally visible and manageable. This is a learning/demo service.

## Migration from V2

V3 replaces V2's files. The schema adds `expires_at` column. New endpoints are added to `routes.ts`. New functions added to `db.ts` and `validation.ts`. No new dependencies beyond V2's `better-sqlite3`.
