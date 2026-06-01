# Features & Logic

This document maps the core business logic: how availability is computed, how bookings are created without double-booking, how "any available stylist" assignment works, and how cancel magic links are secured.

---

## Calendar Booking Flow

### End-to-end sequence

```text
Guest selects service + stylist + date
        │
        ▼
BookingWizard ──GET──► /api/availability?staffId&serviceId&date
        │                      │
        │                      ▼
        │               getAvailableSlots()
        │               (lib/booking/availability.ts)
        │                      │
        ▼                      ▼
Display time buttons ◄── ISO slot strings[]
        │
Guest picks slot + enters details
        │
        ▼
POST /api/book  ──► assertSlotAvailable() ──► INSERT appointment
        │                      │                      │
        │                      │                      ▼
        │                      │               Unique index check
        │                      │               (staff_id, starts_at)
        ▼                      ▼
Optional GCal event    Resend confirmation email
with cancel magic link
```

---

### Step 1 — Load service configuration

`fetchServiceConfig(serviceId)` loads from `public.services`:

- `duration_minutes` — length of the appointment
- `buffer_minutes` — extra gap after `ends_at` when blocking the calendar

Both values feed into slot generation and overlap detection.

---

### Step 2 — Determine working hours

For each stylist and date, `getStaffWindow(staffId, date)` resolves hours:

1. Look up `staff_availability` for `(staff_id, day_of_week)`.
2. If no override, fall back to `business_hours` for that `day_of_week`.
3. If `is_closed = true` or no row, return no slots.

`day_of_week` is computed in salon timezone via `getDayOfWeekInSalonTz()` in `lib/booking/slots.ts`.

---

### Step 3 — Generate candidate slots

`generateCandidateSlots(date, window, durationMinutes, bufferMinutes)`:

- Combines date + `opens_at` / `closes_at` into UTC `Date` objects using `America/New_York`.
- Steps forward in **`SLOT_INTERVAL_MINUTES` (30)** increments.
- A slot is valid only if `slotStart + duration + buffer <= closes_at`.
- Filters out slots in the past (`slot > now()`).

---

### Step 4 — Collect busy intervals

For the selected stylist and day, busy time comes from two sources:

**A. Confirmed appointments (database)**

```typescript
// appointments where staff_id matches, status = 'confirmed', same calendar day
busyIntervals.push({
  start: new Date(appt.starts_at),
  end: addMinutes(new Date(appt.ends_at), service.buffer_minutes),
});
```

**B. Google Calendar FreeBusy (optional)**

If `staff.google_calendar_id` is set and Google OAuth env vars exist, `getFreeBusy()` queries the Calendar API for the same day window. Failures are logged; booking continues with DB-only busy data.

---

### Step 5 — Subtract busy time

`subtractBusySlots()` removes any candidate slot whose `[start, start + duration + buffer)` overlaps a busy interval using standard interval overlap logic:

```typescript
// intervalsOverlap: aStart < bEnd && bStart < aEnd
```

Remaining slots are returned as ISO 8601 strings.

---

### Step 6 — "Any stylist" availability (display)

When `staffId === "any"`, `getAvailableSlotsForAny()`:

1. Loads all active stylists linked to the service via `staff_services` (sorted by `sort_order`).
2. Computes slots per stylist.
3. **Unions** all slots into a `Set` (deduplicated).
4. Returns sorted ascending.

The guest sees the combined availability across eligible stylists.

---

### Step 7 — Book and prevent double-booking

`POST /api/book` performs these checks **before insert**:

| Layer | Mechanism | File |
|-------|-----------|------|
| Application re-check | `assertSlotAvailable(staffId, serviceId, startsAt)` re-runs slot logic at booking time | `lib/booking/availability.ts` |
| Stylist resolution | If `staffId === "any"`, `resolveStaffForAnyBooking()` picks a stylist | Same file |
| Database constraint | Unique partial index on `(staff_id, starts_at) WHERE status = 'confirmed'` | `001_initial_schema.sql` |
| Conflict handling | PostgreSQL error `23505` → HTTP **409** "This time slot was just booked" | `app/api/book/route.ts` |

This defense-in-depth handles race conditions when two guests book the same slot simultaneously.

**Appointment timing on insert:**

```typescript
const startsAt = new Date(body.startsAt);
const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
// Note: buffer_minutes affects scheduling gaps, not ends_at column value
```

---

## "Any Available Stylist" Assignment

When a guest selects **"Any available stylist"** (`staffId: "any"`), the system does **not** count appointments to find the least-busy stylist. Assignment uses a **priority-ordered first-fit** algorithm.

### Availability display vs. booking assignment

| Phase | Behavior |
|-------|----------|
| Slot display | Union of all eligible stylists' open slots |
| Booking assignment | First eligible stylist (by `sort_order`) who has the chosen slot open |

### Algorithm — `resolveStaffForAnyBooking()`

```typescript
const staffMembers = await getEligibleStaffForService(serviceId);
// Sorted ascending by staff.sort_order

for (const member of staffMembers) {
  const slots = await getSlotsForStaff(member.id, serviceId, date, service);
  if (slots.some((slot) => slotMatchesTime(slot, startsAt))) {
    return { staffId: member.id, fullName: member.full_name };
  }
}
return null; // slot no longer available
```

**`slotMatchesTime`** allows ±1000 ms tolerance when comparing ISO strings to the requested `startsAt`.

### Priority order (seed data)

| sort_order | Stylist | Typical role |
|------------|---------|--------------|
| 1 | Vicky | Owner & Master Stylist |
| 2 | Maria Santos | Color Specialist |
| 3 | Jordan Lee | Stylist |
| 4 | Sofia Chen | Master Stylist |

If Vicky and Maria are both free at 2:00 PM, **Vicky is assigned** because she has the lower `sort_order`. This is intentional salon priority routing, not load balancing by appointment volume.

### Booking API flow for `"any"`

```typescript
if (body.staffId === "any") {
  const resolved = await resolveStaffForAnyBooking(body.serviceId, startsAt);
  if (!resolved) return 409;
  resolvedStaffId = resolved.staffId;
}
await assertSlotAvailable(resolvedStaffId, body.serviceId, startsAt);
```

The response includes `stylistName` so the confirmation UI and email show the **resolved** stylist, not "any."

---

## Security Logic — Cancel Magic Links

Guests cancel without an account. Security relies on unguessable tokens, hashed storage, expiry, and consistent error responses.

---

### Token generation (booking time)

In `POST /api/book`:

```typescript
const rawToken = generateCancelToken();       // 32 random bytes → base64url
const cancelTokenHash = hashCancelToken(rawToken);

// Stored in DB — raw token NEVER persisted
await supabase.from("appointments").insert({
  cancel_token_hash: cancelTokenHash,
  cancel_token_expires_at: startsAt.toISOString(), // expires at appointment start
  // ...
});

// Raw token only appears in email URL
const cancelUrl = `${appUrl}/cancel/${rawToken}`;
```

---

### Cryptographic functions (`lib/booking/tokens.ts`)

| Function | Purpose |
|----------|---------|
| `generateCancelToken()` | `randomBytes(32).toString("base64url")` — 256 bits entropy |
| `hashCancelToken(token)` | `SHA-256(pepper + token)` → hex string stored in DB |
| `verifyCancelToken(token, storedHash)` | Timing-safe comparison of hashes (utility; lookup uses indexed equality) |

**Pepper:** `process.env.CANCEL_TOKEN_PEPPER` prepended before hashing. Empty string if unset (works in dev; set in production).

```typescript
export function hashCancelToken(token: string): string {
  const pepper = process.env.CANCEL_TOKEN_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}${token}`).digest("hex");
}
```

---

### Token verification flow

#### Cancel page (SSR) — `GET /cancel/[token]`

`getAppointmentByCancelToken(token)` in `lib/booking/get-appointment-by-token.ts`:

1. Hash the URL token: `hashCancelToken(token)`.
2. Query `appointments` where `cancel_token_hash = hash` (no status filter on read).
3. Join staff, service, customer for display.
4. Return `null` → Next.js `notFound()` (HTTP 404).

The page checks:

- `status !== 'confirmed'` → "Already cancelled"
- `now >= cancel_token_expires_at` → "Cannot cancel" (expired at appointment start)

#### Cancel action — `POST /api/cancel/[token]`

```typescript
const tokenHash = hashCancelToken(token);

const appointment = await supabase
  .from("appointments")
  .select(/* joins */)
  .eq("cancel_token_hash", tokenHash)
  .eq("status", "confirmed")
  .maybeSingle();

if (!appointment) return 404;  // same response for invalid vs. wrong hash

if (now >= cancel_token_expires_at) return 410;  // Gone — window expired

await supabase.from("appointments").update({
  status: "cancelled",
  cancelled_at: now,
});
```

Post-cancel side effects (non-blocking on failure):

- Delete Google Calendar event if `google_event_id` exists
- Send cancellation confirmation email via Resend

---

### Security properties

| Property | Implementation |
|----------|----------------|
| Raw token never stored | Only SHA-256 hash in `cancel_token_hash` |
| DB leak resistance | Pepper (`CANCEL_TOKEN_PEPPER`) required to brute-force from hashes |
| Enumeration resistance | Invalid/expired/wrong token → **404** (cancel API) or **404 page** (SSR lookup) |
| Time-bound | Token expires at `starts_at`; after that, HTTP **410** on cancel POST |
| Single-use | Status moves to `cancelled`; subsequent cancel attempts fail lookup |
| Indexed lookup | Partial index on `cancel_token_hash WHERE status = 'confirmed'` |

---

### Email delivery

`sendBookingConfirmation()` in `lib/email/resend.ts` embeds the cancel URL:

```html
<a href="{cancelUrl}">Cancel appointment</a>
```

If Resend is not configured, booking still succeeds; the raw token exists only in memory during that request (never logged).

---

## Customer Upsert Logic

Returning guests are matched by email:

```typescript
await supabase.from("customers").upsert(
  { email: body.email.toLowerCase(), full_name: body.fullName, phone: body.phone },
  { onConflict: "email" }
);
```

`citext` on `email` ensures case-insensitive uniqueness.

---

## Google Calendar Integration

| Event | Action |
|-------|--------|
| Booking created | `createCalendarEvent()` if stylist has `google_calendar_id` |
| Booking cancelled | `deleteCalendarEvent()` using stored `google_event_id` |
| Availability | `getFreeBusy()` merges external busy blocks |

Events include `extendedProperties.private.appointmentId` for traceability. Calendar failures do not roll back the database transaction.

---

## Internationalization

The landing page and booking shell support **English** and **Korean** via `LanguageProvider`. Booking wizard step labels and form copy are primarily English; translated strings cover marketing content, header nav, and the "any stylist" option.

Locale persists in `localStorage` under key `alo-locale`.

---

## Landing → Booking Deep Link

Service cards link to `/book?service={mockId}` (e.g. `mens-cut`). `resolvePreselectedServiceId()` resolves:

1. Direct UUID if `service` param is already a Supabase ID.
2. Otherwise match `LANDING_SERVICES[].mockId` → `seedName` → `public.services.name`.

The wizard skips step 0 (service selection) when a valid preselection is found.

---

## Error Codes Reference

| HTTP | Route | Meaning |
|------|-------|---------|
| 400 | `/api/book`, `/api/availability` | Zod validation failure |
| 409 | `/api/book` | Slot unavailable or unique constraint conflict |
| 404 | `/api/cancel/[token]` | Invalid token or not confirmed |
| 410 | `/api/cancel/[token]` | Cancel window expired (appointment started or passed) |
| 500 | All API routes | Unexpected server error |

---

## Related Documents

- [architecture.md](./architecture.md) — Component and API structure
- [database-schema.md](./database-schema.md) — Tables, indexes, and RLS
