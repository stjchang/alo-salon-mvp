const IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
] as const;

/** Best-effort client IP from reverse-proxy headers (Vercel, Cloudflare, etc.). */
export function getClientIp(request: Request): string | null {
  for (const name of IP_HEADERS) {
    const value = request.headers.get(name);
    if (!value) continue;

    if (name === "x-forwarded-for") {
      const first = value.split(",")[0]?.trim();
      return first || null;
    }

    return value.trim();
  }

  return null;
}
