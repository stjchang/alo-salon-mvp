import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createServiceClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/supabase/relations";
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
  staffId: string | "any";
  serviceId: string;
  date: string;
};

type ServiceConfig = {
  id: string;
  duration_minutes: number;
  buffer_minutes: number;
};

type StaffRecord = {
  id: string;
  full_name: string;
  google_calendar_id: string | null;
  is_active?: boolean;
  sort_order?: number;
};

const SLOT_MATCH_TOLERANCE_MS = 1000;

function slotMatchesTime(slotIso: string, startsAt: Date): boolean {
  return (
    Math.abs(new Date(slotIso).getTime() - startsAt.getTime()) <
    SLOT_MATCH_TOLERANCE_MS
  );
}

async function fetchServiceConfig(serviceId: string): Promise<ServiceConfig> {
  const supabase = createServiceClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, duration_minutes, buffer_minutes")
    .eq("id", serviceId)
    .eq("is_active", true)
    .single();

  if (serviceError || !service) {
    throw new Error("Invalid service");
  }

  return service;
}

async function getEligibleStaffForService(
  serviceId: string
): Promise<StaffRecord[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("staff_services")
    .select(
      "staff:staff_id ( id, full_name, google_calendar_id, is_active, sort_order )"
    )
    .eq("service_id", serviceId);

  if (error) {
    throw new Error("Failed to load stylists");
  }

  return (data ?? [])
    .map((row) => unwrapRelation(row.staff) as StaffRecord | null)
    .filter((staff): staff is StaffRecord =>
      Boolean(staff && staff.is_active !== false)
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

async function getStaffWindow(
  staffId: string,
  date: string
): Promise<TimeWindow | null> {
  const supabase = createServiceClient();
  const dayOfWeek = getDayOfWeekInSalonTz(date);

  const { data: staffHours } = await supabase
    .from("staff_availability")
    .select("starts_at, ends_at")
    .eq("staff_id", staffId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (staffHours) {
    return {
      opensAt: staffHours.starts_at,
      closesAt: staffHours.ends_at,
      isClosed: false,
    };
  }

  const { data: businessHours } = await supabase
    .from("business_hours")
    .select("opens_at, closes_at, is_closed")
    .eq("day_of_week", dayOfWeek)
    .single();

  if (!businessHours) {
    return null;
  }

  return {
    opensAt: businessHours.opens_at,
    closesAt: businessHours.closes_at,
    isClosed: businessHours.is_closed,
  };
}

export async function getSlotsForStaff(
  staffId: string,
  serviceId: string,
  date: string,
  serviceConfig?: ServiceConfig
): Promise<string[]> {
  const supabase = createServiceClient();
  const service = serviceConfig ?? (await fetchServiceConfig(serviceId));

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, google_calendar_id")
    .eq("id", staffId)
    .eq("is_active", true)
    .single();

  if (staffError || !staff) {
    throw new Error("Invalid stylist");
  }

  const window = await getStaffWindow(staffId, date);
  if (!window || window.isClosed) {
    return [];
  }

  const candidateSlots = generateCandidateSlots(
    date,
    window,
    service.duration_minutes,
    service.buffer_minutes
  );

  if (candidateSlots.length === 0) {
    return [];
  }

  const dayStart = combineDateAndTime(date, window.opensAt.slice(0, 5));
  const dayEnd = combineDateAndTime(date, window.closesAt.slice(0, 5));

  const { data: appointments } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("staff_id", staffId)
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

export async function getAvailableSlotsForAny(
  serviceId: string,
  date: string
): Promise<string[]> {
  const service = await fetchServiceConfig(serviceId);
  const staffMembers = await getEligibleStaffForService(serviceId);
  const slotSet = new Set<string>();

  for (const member of staffMembers) {
    const slots = await getSlotsForStaff(
      member.id,
      serviceId,
      date,
      service
    );
    for (const slot of slots) {
      slotSet.add(slot);
    }
  }

  return [...slotSet].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
}

export async function getAvailableSlots(input: AvailabilityInput) {
  if (input.staffId === "any") {
    return getAvailableSlotsForAny(input.serviceId, input.date);
  }

  return getSlotsForStaff(input.staffId, input.serviceId, input.date);
}

export async function resolveStaffForAnyBooking(
  serviceId: string,
  startsAt: Date
): Promise<{ staffId: string; fullName: string } | null> {
  const date = formatInTimeZone(
    startsAt,
    process.env.SALON_TIMEZONE ?? "America/New_York",
    "yyyy-MM-dd"
  );
  const service = await fetchServiceConfig(serviceId);
  const staffMembers = await getEligibleStaffForService(serviceId);

  for (const member of staffMembers) {
    const slots = await getSlotsForStaff(
      member.id,
      serviceId,
      date,
      service
    );
    if (slots.some((slot) => slotMatchesTime(slot, startsAt))) {
      return { staffId: member.id, fullName: member.full_name };
    }
  }

  return null;
}

export async function assertSlotAvailable(
  staffId: string | "any",
  serviceId: string,
  startsAt: Date
): Promise<void> {
  if (staffId === "any") {
    const resolved = await resolveStaffForAnyBooking(serviceId, startsAt);
    if (!resolved) {
      throw new Error("Selected time slot is no longer available");
    }
    return;
  }

  const date = formatInTimeZone(
    startsAt,
    process.env.SALON_TIMEZONE ?? "America/New_York",
    "yyyy-MM-dd"
  );
  const slots = await getSlotsForStaff(staffId, serviceId, date);
  const isAvailable = slots.some((slot) => slotMatchesTime(slot, startsAt));

  if (!isAvailable) {
    throw new Error("Selected time slot is no longer available");
  }
}
