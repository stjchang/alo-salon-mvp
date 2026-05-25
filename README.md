# ALO Hair Salon — Booking MVP

Modern B2C booking prototype for **ALO Hair Salon** (Syosset, NY). Guests book without an account; confirmations include a secure cancel magic link.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** + Shadcn UI
- **Supabase** (PostgreSQL + RLS)
- **Resend** (email)
- **Google Calendar API** (FreeBusy + event create/delete)

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`
3. Copy **Project URL**, **anon key**, and **service role key** into `.env.local` (see `.env.example`).

### 3. Resend

1. Create an API key at [resend.com](https://resend.com).
2. Verify your sending domain (or use `resend.dev` for testing).
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.

### 4. Run locally

```bash
cp .env.example .env.local
# fill in values
npm run dev
```

Open [http://localhost:3000/book](http://localhost:3000/book).

---

## Google Calendar setup

The salon uses **one Google account** with a **calendar per stylist**. The app reads busy times (FreeBusy) and writes/deletes booking events.

### Step 1 — Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project → enable **Google Calendar API**.
3. Configure **OAuth consent screen** (External + test users for dev).
4. Create **OAuth 2.0 Client ID** (Desktop app or Web).

### Step 2 — Obtain refresh token

```bash
npx tsx scripts/get-google-refresh-token.ts
```

Follow the URL, authorize, paste the code. Add the printed `GOOGLE_REFRESH_TOKEN` to `.env.local`.

Required env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### Step 3 — Stylist calendars

1. In Google Calendar, create one calendar per stylist (or use existing).
2. Open calendar **Settings** → **Integrate calendar** → copy **Calendar ID**.
3. In Supabase, update `staff.google_calendar_id` for each stylist:

```sql
update public.staff
set google_calendar_id = 'stylist-calendar-id@group.calendar.google.com'
where full_name = 'Vicky';
```

If Google Calendar env vars are missing, booking still works using **database hours + appointments only**.

---

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/availability` | GET | Available slots (`staffId`, `serviceId`, `date`) |
| `/api/book` | POST | Create booking + email + optional GCal event |
| `/api/cancel/[token]` | POST | Cancel via magic link token |

## Security

- Cancel tokens: 256-bit random, **SHA-256 hash only** stored in DB.
- Public Supabase RLS: read catalog tables only; writes via **service role** in API routes.
- Invalid cancel tokens return **404** (no enumeration).

## Project structure

```
app/
  api/availability|book|cancel/
  book/          # Booking wizard
  cancel/[token] # Magic link cancel page
components/booking/
lib/booking|google|email|supabase/
supabase/migrations/
scripts/get-google-refresh-token.ts
```

## License

Private — demo / MVP use for ALO Hair Salon.
