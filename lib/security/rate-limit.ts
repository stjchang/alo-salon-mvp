import { createServiceClient } from "@/lib/supabase/server";

export const BOOKING_RATE_LIMIT_MAX = 2;
export const BOOKING_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function countRecentBookingsByIp(
  clientIp: string
): Promise<number> {
  const supabase = createServiceClient();
  const since = new Date(
    Date.now() - BOOKING_RATE_LIMIT_WINDOW_MS
  ).toISOString();

  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_ip", clientIp)
    .gte("created_at", since);

  if (error) {
    throw new Error("Failed to check booking rate limit");
  }

  return count ?? 0;
}

export async function isBookingRateLimited(
  clientIp: string
): Promise<boolean> {
  const count = await countRecentBookingsByIp(clientIp);
  return count >= BOOKING_RATE_LIMIT_MAX;
}
