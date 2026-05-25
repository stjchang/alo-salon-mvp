import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateCancelToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashCancelToken(token: string): string {
  const pepper = process.env.CANCEL_TOKEN_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}${token}`).digest("hex");
}

export function verifyCancelToken(token: string, storedHash: string): boolean {
  const computed = Buffer.from(hashCancelToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}
