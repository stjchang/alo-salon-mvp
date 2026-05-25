import { addMinutes, format, parse } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { SALON_TIMEZONE, SLOT_INTERVAL_MINUTES } from "@/lib/constants";

export type TimeWindow = {
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export type BusyInterval = {
  start: Date;
  end: Date;
};

export function parseSalonDate(date: string): Date {
  return parse(date, "yyyy-MM-dd", new Date());
}

export function getDayOfWeekInSalonTz(date: string): number {
  const zoned = toZonedTime(parseSalonDate(date), SALON_TIMEZONE);
  return zoned.getDay();
}

export function combineDateAndTime(date: string, time: string): Date {
  const localDateTime = `${date}T${time}:00`;
  return fromZonedTime(localDateTime, SALON_TIMEZONE);
}

export function generateCandidateSlots(
  date: string,
  window: TimeWindow,
  durationMinutes: number,
  bufferMinutes: number
): Date[] {
  if (window.isClosed) return [];

  const dayStart = combineDateAndTime(date, window.opensAt.slice(0, 5));
  const dayEnd = combineDateAndTime(date, window.closesAt.slice(0, 5));
  const totalMinutes = durationMinutes + bufferMinutes;
  const slots: Date[] = [];
  let cursor = dayStart;

  while (addMinutes(cursor, totalMinutes) <= dayEnd) {
    slots.push(cursor);
    cursor = addMinutes(cursor, SLOT_INTERVAL_MINUTES);
  }

  const now = new Date();
  return slots.filter((slot) => slot > now);
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function subtractBusySlots(
  slots: Date[],
  durationMinutes: number,
  bufferMinutes: number,
  busyIntervals: BusyInterval[]
): Date[] {
  const totalMinutes = durationMinutes + bufferMinutes;

  return slots.filter((slotStart) => {
    const slotEnd = addMinutes(slotStart, totalMinutes);
    return !busyIntervals.some((busy) =>
      intervalsOverlap(slotStart, slotEnd, busy.start, busy.end)
    );
  });
}

export function formatSlotLabel(date: Date): string {
  const zoned = toZonedTime(date, SALON_TIMEZONE);
  return format(zoned, "h:mm a");
}

export function formatAppointmentDateTime(date: Date): string {
  const zoned = toZonedTime(date, SALON_TIMEZONE);
  return format(zoned, "EEEE, MMMM d, yyyy 'at' h:mm a");
}
