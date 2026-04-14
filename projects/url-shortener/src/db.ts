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
