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
