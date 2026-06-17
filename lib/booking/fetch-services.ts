import { createClient } from "@supabase/supabase-js";

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_display: string | null;
};

export async function fetchBookingServices(): Promise<BookingService[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return [];
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_display")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch booking services:", error.message);
    return [];
  }

  return data ?? [];
}
