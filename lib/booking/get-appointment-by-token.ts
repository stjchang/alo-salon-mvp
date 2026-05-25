import { createServiceClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/supabase/relations";
import { hashCancelToken } from "@/lib/booking/tokens";

export async function getAppointmentByCancelToken(token: string) {
  const tokenHash = hashCancelToken(token);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      cancel_token_expires_at,
      staff:staff_id ( full_name ),
      service:service_id ( name ),
      customer:customer_id ( full_name, email )
    `
    )
    .eq("cancel_token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;

  const staff = unwrapRelation(data.staff);
  const service = unwrapRelation(data.service);
  const customer = unwrapRelation(data.customer);

  if (!staff || !service || !customer) return null;

  return {
    id: data.id,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    status: data.status,
    cancelTokenExpiresAt: data.cancel_token_expires_at,
    staffName: staff.full_name,
    serviceName: service.name,
    customerName: customer.full_name,
    customerEmail: customer.email,
  };
}
