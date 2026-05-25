import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createServiceClient } from "@/lib/supabase/server";
import { getFreeBusy } from "@/lib/google/calendar";
import {
  combineDateAndTime,
  generateCandidateSlots,
  getDayOfWeekInSalonTz,
  subtractBusySlots,
  type BusyInterval,
  type TimeWindow,
} from "@/lib/booking/slots";

type AvailabilityInput = {
  staffId: string;
  serviceId: string;
  date: string;
};

export async function getAvailableSlots(input: AvailabilityInput) {
  const supabase = createServiceClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, duration_minutes, buffer_minutes")
    .eq("id", input.serviceId)
    .eq("is_active", true)
    .single();

  if (serviceError || !service) {
    throw new Error("Invalid service");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, google_calendar_id")
    .eq("id", input.staffId)
    .eq("is_active", true)
    .single();

  if (staffError || !staff) {
    throw new Error("Invalid stylist");
  }

  const dayOfWeek = getDayOfWeekInSalonTz(input.date);
  let window: TimeWindow | null = null;

  const { data: staffHours } = await supabase
    .from("staff_availability")
    .select("starts_at, ends_at")
    .eq("staff_id", input.staffId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (staffHours) {
    window = {
      opensAt: staffHours.starts_at,
      closesAt: staffHours.ends_at,
      isClosed: false,
    };
  } else {
    const { data: businessHours } = await supabase
      .from("business_hours")
      .select("opens_at, closes_at, is_closed")
      .eq("day_of_week", dayOfWeek)
      .single();

    if (businessHours) {
      window = {
        opensAt: businessHours.opens_at,
        closesAt: businessHours.closes_at,
        isClosed: businessHours.is_closed,
      };
    }
  }

  if (!window || window.isClosed) {
    return [];
  }

  const candidateSlots = generateCandidateSlots(
    input.date,
    window,
    service.duration_minutes,
    service.buffer_minutes
  );

  if (candidateSlots.length === 0) {
    return [];
  }

  const dayStart = combineDateAndTime(input.date, window.opensAt.slice(0, 5));
  const dayEnd = combineDateAndTime(input.date, window.closesAt.slice(0, 5));

  const { data: appointments } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("staff_id", input.staffId)
    .eq("status", "confirmed")
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString());

  const busyIntervals: BusyInterval[] = (appointments ?? []).map((appt) => ({
    start: new Date(appt.starts_at),
    end: addMinutes(new Date(appt.ends_at), service.buffer_minutes),
  }));

  if (staff.google_calendar_id) {
    try {
      const gcalBusy = await getFreeBusy(
        staff.google_calendar_id,
        dayStart,
        dayEnd
      );
      busyIntervals.push(...gcalBusy);
    } catch (error) {
      console.error("Google Calendar FreeBusy failed:", error);
    }
  }

  const available = subtractBusySlots(
    candidateSlots,
    service.duration_minutes,
    service.buffer_minutes,
    busyIntervals
  );

  return available.map((slot) => slot.toISOString());
}

export async function assertSlotAvailable(
  staffId: string,
  serviceId: string,
  startsAt: Date
): Promise<void> {
  const date = formatInTimeZone(startsAt, process.env.SALON_TIMEZONE ?? "America/New_York", "yyyy-MM-dd");
  const slots = await getAvailableSlots({ staffId, serviceId, date });
  const isAvailable = slots.some(
    (slot) =>
      Math.abs(new Date(slot).getTime() - startsAt.getTime()) < 1000
  );

  if (!isAvailable) {
    throw new Error("Selected time slot is no longer available");
  }
}
