import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validators/booking";
import { createServiceClient } from "@/lib/supabase/server";
import { generateCancelToken, hashCancelToken } from "@/lib/booking/tokens";
import { assertSlotAvailable } from "@/lib/booking/availability";
import { createCalendarEvent } from "@/lib/google/calendar";
import { sendBookingConfirmation } from "@/lib/email/resend";

export async function POST(request: Request) {
  try {
    const body = bookingSchema.parse(await request.json());
    const supabase = createServiceClient();

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, duration_minutes, buffer_minutes")
      .eq("id", body.serviceId)
      .eq("is_active", true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 });
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(
      startsAt.getTime() + service.duration_minutes * 60_000
    );

    await assertSlotAvailable(body.staffId, body.serviceId, startsAt);

    const rawToken = generateCancelToken();
    const cancelTokenHash = hashCancelToken(rawToken);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          email: body.email.toLowerCase(),
          full_name: body.fullName,
          phone: body.phone,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Failed to save customer" },
        { status: 500 }
      );
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        customer_id: customer.id,
        staff_id: body.staffId,
        service_id: body.serviceId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        cancel_token_hash: cancelTokenHash,
        cancel_token_expires_at: startsAt.toISOString(),
      })
      .select("id")
      .single();

    if (appointmentError || !appointment) {
      const isConflict = appointmentError?.code === "23505";
      return NextResponse.json(
        {
          error: isConflict
            ? "This time slot was just booked"
            : "Failed to create appointment",
        },
        { status: isConflict ? 409 : 500 }
      );
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("full_name, google_calendar_id")
      .eq("id", body.staffId)
      .single();

    if (staff?.google_calendar_id) {
      try {
        const googleEventId = await createCalendarEvent({
          calendarId: staff.google_calendar_id,
          summary: `ALO — ${service.name} — ${body.fullName}`,
          description: `Phone: ${body.phone}\nEmail: ${body.email}\nAppt ID: ${appointment.id}`,
          startsAt,
          endsAt,
          appointmentId: appointment.id,
        });

        if (googleEventId) {
          await supabase
            .from("appointments")
            .update({ google_event_id: googleEventId })
            .eq("id", appointment.id);
        }
      } catch (error) {
        console.error("Google Calendar insert failed:", error);
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const cancelUrl = `${appUrl}/cancel/${rawToken}`;

    try {
      await sendBookingConfirmation({
        to: body.email,
        customerName: body.fullName,
        serviceName: service.name,
        stylistName: staff?.full_name ?? "Your stylist",
        startsAt,
        cancelUrl,
      });
    } catch (error) {
      console.error("Resend confirmation failed:", error);
    }

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid booking data" }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message.includes("no longer available")
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
