import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/supabase/relations";
import { hashCancelToken } from "@/lib/booking/tokens";
import { deleteCalendarEvent } from "@/lib/google/calendar";
import { sendCancellationConfirmation } from "@/lib/email/resend";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const tokenHash = hashCancelToken(token);
  const supabase = createServiceClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      starts_at,
      status,
      cancel_token_expires_at,
      google_event_id,
      staff:staff_id ( full_name, google_calendar_id ),
      service:service_id ( name ),
      customer:customer_id ( full_name, email )
    `
    )
    .eq("cancel_token_hash", tokenHash)
    .eq("status", "confirmed")
    .maybeSingle();

  if (error || !appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (new Date() >= new Date(appointment.cancel_token_expires_at)) {
    return NextResponse.json(
      { error: "Cancellation window has expired" },
      { status: 410 }
    );
  }

  const staff = unwrapRelation(appointment.staff);
  const service = unwrapRelation(appointment.service);
  const customer = unwrapRelation(appointment.customer);

  if (!staff || !service || !customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointment.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }

  if (staff.google_calendar_id && appointment.google_event_id) {
    try {
      await deleteCalendarEvent(
        staff.google_calendar_id,
        appointment.google_event_id
      );
    } catch (err) {
      console.error("Google Calendar delete failed:", err);
    }
  }

  try {
    await sendCancellationConfirmation({
      to: customer.email,
      customerName: customer.full_name,
      serviceName: service.name,
      stylistName: staff.full_name,
      startsAt: new Date(appointment.starts_at),
    });
  } catch (err) {
    console.error("Cancellation email failed:", err);
  }

  return NextResponse.json({ success: true });
}
