# URL Shortener API — Design Spec

**Date:** 2026-04-14
**Location:** `projects/url-shortener/`

## Overview

A minimal URL shortener API built with TypeScript and Express. Accepts long URLs, returns short codes, and redirects short codes to their original URLs.

## Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express
- **Storage:** In-memory `Map<string, string>` (data lost on restart)
- **Code generation:** `crypto.randomBytes` from Node stdlib, encoded as base62

## Endpoints

### `POST /shorten`

- **Body:** `{ "url": "https://example.com/long-path" }` (JSON)
- **Validation:** URL must be present and parseable by `new URL()` constructor
- **Behavior:** Generates a random 6-character alphanumeric code, stores the mapping `code → url`, returns the short URL
- **Success response (201):**
  ```json
  { "shortUrl": "http://localhost:3000/abc123" }
  ```
- **Error response (400):**
  ```json
  { "error": "Invalid or missing URL" }
  ```

### `GET /:code`

- **Behavior:** Looks up the code in the in-memory store. If found, responds with a `302` redirect to the original URL.
- **Error response (404):**
  ```json
  { "error": "Not found" }
  ```

## Project Structure

```
projects/url-shortener/
├── src/
│   ├── index.ts        # Express app setup, routes, server start
│   └── store.ts        # In-memory Map, generateCode(), get/set helpers
├── package.json
└── tsconfig.json
```

## Key Decisions

- **URL validation:** `new URL()` constructor — no external dependencies needed
- **Code format:** 6-character alphanumeric string from `crypto.randomBytes`, base62 encoded. Retry on collision (astronomically unlikely with a small in-memory store).
- **Port:** 3000 by default, configurable via `PORT` environment variable
- **Redirect type:** 302 (temporary) — allows updating the target later without browser cache issues
- **No tests, no auth, no rate limiting** — intentionally minimal per requirements
