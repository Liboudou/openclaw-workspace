import { describe, it, expect, beforeEach } from "vitest";
import { initDb, insertUrl, findUrl, incrementClicks, codeExists, deleteUrl, listUrls } from "../db";

beforeEach(() => {
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
