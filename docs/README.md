# ALO Hair Salon — Documentation

Welcome to the technical documentation for **ALO Hair Salon**, a B2C online booking application for a hair salon in Syosset, NY. Guests can browse services, book appointments without creating an account, receive email confirmations, and cancel via a secure magic link.

---

## What This Application Does

| Capability | Description |
|------------|-------------|
| Marketing landing page | Single-page funnel with hero, services, stylists, testimonials, and contact info |
| Online booking | Four-step wizard: service → stylist → date/time → guest details |
| Availability engine | Computes open slots from business hours, existing appointments, and optional Google Calendar FreeBusy |
| Email notifications | Booking confirmation and cancellation emails via Resend |
| Self-service cancellation | Magic-link URLs with hashed tokens; no login required |

---

## Tech Stack (Summary)

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Shadcn UI** (`@base-ui/react`, Radix-style components)
- **Supabase** (PostgreSQL, Row-Level Security, service-role writes)
- **Resend** (transactional email)
- **Google Calendar API** (FreeBusy queries, event create/delete)
- **Zod** (API input validation), **date-fns** / **date-fns-tz** (timezone-aware scheduling)

See [architecture.md](./architecture.md) for a full system map.

---

## Prerequisites

| Requirement | Version / Notes |
|-------------|-----------------|
| Node.js | 20+ recommended |
| npm | Bundled with Node |
| Supabase project | Free tier or higher; migrations applied |
| Resend account | Optional for local dev (emails skipped if `RESEND_API_KEY` is unset) |
| Google Cloud project | Optional; enables calendar sync and external busy blocking |

---

## Environment Variables

Create `.env.local` at the project root:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App URL (used in cancel links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Salon timezone (defaults to America/New_York)
SALON_TIMEZONE=America/New_York

# Cancel token security (recommended in production)
CANCEL_TOKEN_PEPPER=<long-random-secret>

# Resend (optional — skips email if missing)
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL="ALO Hair Salon <bookings@yourdomain.com>"

# Google Calendar (optional — booking works without these)
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
GOOGLE_REFRESH_TOKEN=<refresh-token>
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run migrations **in order**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`
   - `supabase/migrations/003_add_perm_service.sql` (safe if Perm already in 002)
   - `supabase/migrations/004_rename_alex_to_vicky.sql` (only if legacy seed had "Alex Kim")
3. Copy **Project URL**, **anon key**, and **service role key** into `.env.local`.

See [database-schema.md](./database-schema.md) for table and RLS details.

### 3. Configure Resend (optional)

1. Create an API key at [resend.com](https://resend.com).
2. Verify your sending domain (or use `resend.dev` for testing).
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

### 4. Run the development server

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| [http://localhost:3000](http://localhost:3000) | Landing page |
| [http://localhost:3000/book](http://localhost:3000/book) | Booking wizard |
| [http://localhost:3000/book?service=mens-cut](http://localhost:3000/book?service=mens-cut) | Pre-selected service (mock ID from landing) |

### 5. Google Calendar (optional)

```bash
npx tsx scripts/get-google-refresh-token.ts
```

Follow the OAuth flow, then add `GOOGLE_REFRESH_TOKEN` to `.env.local`. Map each stylist's calendar ID in Supabase:

```sql
update public.staff
set google_calendar_id = 'stylist-calendar-id@group.calendar.google.com'
where full_name = 'Vicky';
```

Full setup steps are in the root [README.md](../README.md#google-calendar-setup).

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Next.js dev server |
| `build` | `npm run build` | Production build |
| `start` | `npm run start` | Serve production build |
| `lint` | `npm run lint` | Run ESLint |

---

## Documentation Index

| Document | Contents |
|----------|----------|
| [architecture.md](./architecture.md) | Tech stack, folder structure, component layout, API surface |
| [database-schema.md](./database-schema.md) | PostgreSQL tables, indexes, RLS policies, triggers |
| [features-and-logic.md](./features-and-logic.md) | Booking flow, availability, stylist assignment, cancel tokens |

---

## Key Routes

| Path | Type | Description |
|------|------|-------------|
| `/` | Page | Marketing landing funnel |
| `/book` | Page | Booking wizard (`?service=` pre-selects via mock ID) |
| `/cancel/[token]` | Page | Magic-link cancellation UI |
| `/api/availability` | API | GET — available time slots |
| `/api/book` | API | POST — create appointment |
| `/api/cancel/[token]` | API | POST — cancel appointment |

---

## License

Private — demo / MVP use for ALO Hair Salon.
