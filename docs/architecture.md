# Architecture

This document describes how the ALO Hair Salon booking application is structured: the technology choices, directory layout, frontend composition, and server-side integration points.

---

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Guest)                          │
│  Landing Page ──► /book wizard ──► /cancel/[token]              │
└────────────┬───────────────────────────────┬────────────────────┘
             │ Supabase anon (read catalog)   │ fetch() to API routes
             ▼                                ▼
┌────────────────────────┐      ┌─────────────────────────────────┐
│  Supabase PostgreSQL   │◄─────│  Next.js App Router (Server)    │
│  (RLS on public tables)│      │  /api/book, /availability,      │
└────────────────────────┘      │  /cancel — service role writes   │
                                └──────────┬──────────┬───────────┘
                                           │          │
                                    Resend │          │ Google Calendar
                                    (email)│          │ (FreeBusy + events)
```

Guests never authenticate. The browser reads catalog data (services, staff, hours) through Supabase with the **anon key** and RLS policies. All writes—appointments, customers, cancellations—go through **Next.js Route Handlers** using the **service role key**, which bypasses RLS.

---

## Tech Stack

### Frontend

| Layer | Technology | Role |
|-------|------------|------|
| Framework | Next.js 16 (App Router) | Routing, SSR for cancel page, API routes |
| UI library | React 19 | Components, client state |
| Styling | Tailwind CSS 4 | Utility-first CSS via `app/globals.css` |
| Component kit | Shadcn UI | `components/ui/*` — Button, Card, Calendar, Dialog, etc. |
| Forms | react-hook-form + @hookform/resolvers | Available but wizard uses controlled local state |
| Validation (client-adjacent) | Zod schemas in `lib/validators/booking.ts` | Shared shape with API |
| i18n | Custom `LanguageProvider` | English / Korean via `lib/i18n/translations.ts` |
| Carousel | embla-carousel-react | Testimonials on landing page |

### Backend / Data

| Layer | Technology | Role |
|-------|------------|------|
| Database | Supabase (PostgreSQL) | Appointments, catalog, customers |
| DB client (browser) | `@supabase/supabase-js` via `lib/supabase/browser.ts` | Read-only catalog queries |
| DB client (server) | `@supabase/supabase-js` via `lib/supabase/server.ts` | Service role — all writes |
| Email | Resend (`lib/email/resend.ts`) | Confirmation + cancellation emails |
| Calendar | googleapis (`lib/google/calendar.ts`) | FreeBusy, event insert/delete |
| Scheduling logic | `lib/booking/*` | Slots, availability, tokens |
| Timezone | `date-fns-tz`, `SALON_TIMEZONE` constant | America/New_York default |

---

## Folder Structure

```text
alo-salon/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout, fonts, LanguageProvider
│   ├── page.tsx                  # Home → LandingPage
│   ├── globals.css               # Tailwind + theme tokens
│   ├── book/
│   │   └── page.tsx              # Booking page (reads ?service= search param)
│   ├── cancel/[token]/
│   │   ├── page.tsx              # Cancel confirmation UI (SSR)
│   │   └── not-found.tsx         # Invalid token → 404
│   └── api/
│       ├── availability/route.ts # GET slots
│       ├── book/route.ts         # POST create booking
│       └── cancel/[token]/route.ts # POST cancel booking
│
├── components/
│   ├── booking/
│   │   ├── booking-wizard.tsx    # 4-step booking flow (client)
│   │   ├── book-page-content.tsx # Book page shell + header
│   │   └── cancel-appointment-button.tsx
│   ├── landing/
│   │   ├── landing-page.tsx      # Single-page marketing funnel
│   │   ├── site-header.tsx       # Nav + language toggle
│   │   └── language-toggle.tsx
│   ├── providers/
│   │   └── language-provider.tsx # Locale context (en | ko)
│   └── ui/                       # Shadcn primitives
│
├── lib/
│   ├── booking/
│   │   ├── availability.ts       # Slot computation, stylist resolution
│   │   ├── slots.ts              # Time window math, busy subtraction
│   │   ├── tokens.ts             # Cancel token generate/hash/verify
│   │   ├── get-appointment-by-token.ts
│   │   └── resolve-service.ts    # Landing mockId → Supabase UUID
│   ├── supabase/
│   │   ├── browser.ts            # Anon client for browser
│   │   ├── server.ts             # Service role client
│   │   └── relations.ts          # unwrapRelation helper
│   ├── google/calendar.ts        # OAuth + Calendar API
│   ├── email/resend.ts           # Transactional emails
│   ├── validators/booking.ts     # Zod schemas
│   ├── i18n/translations.ts      # EN/KO strings
│   ├── landing-data.ts           # Static landing content + seed name mapping
│   ├── images.ts                 # Public image paths + salon contact
│   ├── constants.ts              # SALON_TIMEZONE, SLOT_INTERVAL_MINUTES
│   └── utils.ts                  # cn() classname helper
│
├── supabase/migrations/          # SQL schema + seed data
├── scripts/get-google-refresh-token.ts
├── public/images/                # Hero, staff photos
└── docs/                         # This documentation suite
```

---

## Component Architecture

### Single-page landing funnel

The home route (`app/page.tsx`) renders `LandingPage`, a **client component** that acts as a vertical marketing funnel:

1. **Hero** — Full-viewport background, primary CTA to `/book`
2. **Services** — Grid of cards from `LANDING_SERVICES`; each links to `/book?service={mockId}`
3. **Stylists** — Staff profiles from `LANDING_STAFF` (static content, not live Supabase)
4. **Testimonials** — Carousel of translated quotes
5. **Contact / footer** — Address, hours, map embed, social links from `lib/images.ts`

Landing content is **decoupled from the database**: service cards use mock IDs (`mens-cut`, `womens-cut`, …) that `resolvePreselectedServiceId()` maps to Supabase UUIDs by matching `seedName` → `public.services.name`.

### Booking flow

```text
/book (BookPageContent)
  └── SiteHeader (variant="book")
  └── BookingWizard
        Step 0: Service     → Supabase read (services)
        Step 1: Stylist     → Supabase read (staff_services + staff)
                              includes "Any available stylist" (staffId = "any")
        Step 2: Date & time → GET /api/availability
        Step 3: Details     → POST /api/book
        Success state       → Confirmation card + email notice
```

The wizard is entirely client-side except for availability and booking API calls. It lazy-initializes the Supabase browser client and shows a configuration error if env vars are missing.

### Cancellation flow

```text
Email link → /cancel/[rawToken] (SSR page)
  └── getAppointmentByCancelToken() — hash token, load appointment
  └── CancelAppointmentButton → POST /api/cancel/[token]
  └── router.refresh() — re-render page (cancelled / expired states)
```

### Root layout

`app/layout.tsx` wraps all pages in:

- Geist font variables
- `LanguageProvider` for `t()` translations and locale persistence (`localStorage` key `alo-locale`)

---

## Data Access Patterns

| Context | Client | Tables accessed | Operations |
|---------|--------|-----------------|------------|
| Browser (wizard) | Anon Supabase | `services`, `staff_services`, `staff` | SELECT only (RLS) |
| API routes | Service role | All tables | INSERT, UPDATE, UPSERT |
| Cancel page (SSR) | Service role | `appointments` + joins | SELECT, UPDATE via API |

The service role key **must never** be exposed to the browser. It lives only in server-side code (`lib/supabase/server.ts`).

---

## API Endpoints

| Route | Method | Query / Body | Response |
|-------|--------|--------------|----------|
| `/api/availability` | GET | `staffId` (UUID or `"any"`), `serviceId`, `date` (`YYYY-MM-DD`) | `{ slots: string[] }` ISO timestamps |
| `/api/book` | POST | `bookingSchema` — see validators | `201 { appointmentId, stylistName }` or `409` conflict |
| `/api/cancel/[token]` | POST | Token in path | `{ success: true }` or `404` / `410` |

Validation schemas live in `lib/validators/booking.ts`:

```typescript
// staffId accepts a UUID or the literal "any"
export const staffIdSchema = z.union([z.literal("any"), z.string().uuid()]);
```

---

## External Integrations

### Resend

- Gracefully skipped if `RESEND_API_KEY` is unset (console warning only).
- Sends HTML confirmation with cancel button linking to `{NEXT_PUBLIC_APP_URL}/cancel/{rawToken}`.

### Google Calendar

- Single OAuth refresh token for the salon Google account.
- Each stylist may have `staff.google_calendar_id` set in Supabase.
- **FreeBusy** blocks external calendar events from availability.
- **events.insert** on booking; **events.delete** on cancellation.
- Failures are logged but do not fail the booking transaction.

---

## Configuration Constants

| Constant | Location | Default | Purpose |
|----------|----------|---------|---------|
| `SALON_TIMEZONE` | `lib/constants.ts` | `America/New_York` | All slot math |
| `SLOT_INTERVAL_MINUTES` | `lib/constants.ts` | `30` | Grid step for candidate slots |
| Service buffer | `services.buffer_minutes` | Per service (seed: 10–15 min) | Gap after appointment ends |

---

## Security Model (High Level)

- **RLS** on all public tables; catalog tables allow anonymous SELECT; `customers` and `appointments` have RLS enabled with **no public policies** (deny-by-default for anon).
- **Cancel tokens**: 256-bit random, stored as SHA-256 hash only; raw token sent once in email.
- **Token enumeration**: Invalid tokens return HTTP 404, same as not found.
- See [features-and-logic.md](./features-and-logic.md) for cryptographic details.

---

## Related Documents

- [database-schema.md](./database-schema.md) — Tables, indexes, RLS, triggers
- [features-and-logic.md](./features-and-logic.md) — Booking and cancellation workflows
