import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function assertSupabaseUrl(url: string): void {
  if (url.startsWith("sb_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be your project URL (https://<ref>.supabase.co), not an API key. Find it in Supabase → Project Settings → API."
    );
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}". Use https://<project-ref>.supabase.co from Supabase → Project Settings → API.`
    );
  }
}

export function createBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  assertSupabaseUrl(url);

  browserClient = createClient(url, key);
  return browserClient;
}
