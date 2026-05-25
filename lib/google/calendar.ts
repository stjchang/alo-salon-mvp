import { google } from "googleapis";
import { SALON_TIMEZONE } from "@/lib/constants";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function getFreeBusy(
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const auth = getOAuthClient();
  if (!auth) return [];

  const calendar = google.calendar({ version: "v3", auth });
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: SALON_TIMEZONE,
      items: [{ id: calendarId }],
    },
  });

  const busy = response.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter((block) => block.start && block.end)
    .map((block) => ({
      start: new Date(block.start!),
      end: new Date(block.end!),
    }));
}

type CreateEventInput = {
  calendarId: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  appointmentId: string;
};

export async function createCalendarEvent(
  input: CreateEventInput
): Promise<string | null> {
  const auth = getOAuthClient();
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  const response = await calendar.events.insert({
    calendarId: input.calendarId,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: input.startsAt.toISOString(),
        timeZone: SALON_TIMEZONE,
      },
      end: {
        dateTime: input.endsAt.toISOString(),
        timeZone: SALON_TIMEZONE,
      },
      extendedProperties: {
        private: {
          appointmentId: input.appointmentId,
        },
      },
    },
  });

  return response.data.id ?? null;
}

export async function deleteCalendarEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  const auth = getOAuthClient();
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId,
    eventId,
  });
}
