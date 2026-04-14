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
