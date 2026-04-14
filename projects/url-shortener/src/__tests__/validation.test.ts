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
