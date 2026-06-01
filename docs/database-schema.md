# Database Schema

The ALO Hair Salon application stores all persistent data in **Supabase (PostgreSQL)**. Schema is defined in `supabase/migrations/` and applied manually or via the Supabase CLI.

All timestamps use `timestamptz`. Business hours and slot generation assume **`America/New_York`** unless `SALON_TIMEZONE` is overridden in the app.

---

## Extensions

| Extension | Purpose |
|-----------|---------|
| `pgcrypto` | `gen_random_uuid()` for primary keys |
| `citext` | Case-insensitive unique email on `customers.email` |

---

## Enums

### `appointment_status`

| Value | Description |
|-------|-------------|
| `confirmed` | Active booking |
| `cancelled` | Guest or system cancelled |
| `completed` | Reserved for future use (not set by current app code) |

---

## Tables

### `public.services`

Salon service catalog (cuts, color, treatments).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Service identifier |
| `name` | `text` | NOT NULL | Display name (e.g. "Men's Cut") |
| `description` | `text` | nullable | Short description |
| `duration_minutes` | `int` | NOT NULL, `> 0` | Appointment length |
| `buffer_minutes` | `int` | NOT NULL, default `0`, `>= 0` | Post-appointment buffer for scheduling |
| `price_display` | `text` | nullable | Display price (e.g. `$35+`) |
| `is_active` | `boolean` | NOT NULL, default `true` | Soft hide from booking |
| `sort_order` | `int` | NOT NULL, default `0` | Display ordering |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Row creation time |

**Seed data (9 services):** Men's Cut, Women's Cut, Blowout, Single Process Color, Partial Highlights, Full Highlights, Balayage, Keratin Treatment, Perm.

---

### `public.staff`

Stylists who perform services.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Stylist identifier |
| `full_name` | `text` | NOT NULL | Display name |
| `title` | `text` | nullable | Role title |
| `bio` | `text` | nullable | Profile text |
| `photo_url` | `text` | nullable | Photo URL (unused in current UI; landing uses static images) |
| `google_calendar_id` | `text` | nullable | Google Calendar ID for FreeBusy + events |
| `is_active` | `boolean` | NOT NULL, default `true` | Soft hide from booking |
| `sort_order` | `int` | NOT NULL, default `0` | Priority for "any stylist" assignment |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Row creation time |

**Seed staff:** Vicky (sort 1), Maria Santos (2), Jordan Lee (3), Sofia Chen (4).

---

### `public.staff_services`

Many-to-many: which stylists can perform which services.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `staff_id` | `uuid` | PK (composite), FK → `staff(id)` ON DELETE CASCADE | Stylist |
| `service_id` | `uuid` | PK (composite), FK → `services(id)` ON DELETE CASCADE | Service |

**Relationships:** Composite primary key `(staff_id, service_id)`.

---

### `public.business_hours`

Salon-wide operating hours. `day_of_week` follows JavaScript convention: **0 = Sunday … 6 = Saturday**.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Row identifier |
| `day_of_week` | `smallint` | NOT NULL, 0–6, UNIQUE | Day index |
| `opens_at` | `time` | NOT NULL | Opening time |
| `closes_at` | `time` | NOT NULL | Closing time |
| `is_closed` | `boolean` | NOT NULL, default `false` | Closed all day |

**Seed schedule:**

| Day | Hours | Closed |
|-----|-------|--------|
| Sun (0) | 09:00–17:00 | Yes |
| Mon–Wed (1–3) | 09:00–19:00 | No |
| Thu–Fri (4–5) | 09:00–20:00 | No |
| Sat (6) | 09:00–17:00 | No |

---

### `public.staff_availability`

Optional per-stylist hour overrides. When a row exists for `(staff_id, day_of_week)`, it replaces salon `business_hours` for that stylist on that day.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Row identifier |
| `staff_id` | `uuid` | NOT NULL, FK → `staff(id)` ON DELETE CASCADE | Stylist |
| `day_of_week` | `smallint` | NOT NULL, 0–6 | Day index |
| `starts_at` | `time` | NOT NULL | Override start |
| `ends_at` | `time` | NOT NULL | Override end |

**Unique:** `(staff_id, day_of_week)`.

---

### `public.customers`

Guest records keyed by email. No auth accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Customer identifier |
| `email` | `citext` | NOT NULL, UNIQUE | Email (case-insensitive unique) |
| `full_name` | `text` | NOT NULL | Guest name |
| `phone` | `text` | NOT NULL | Contact phone |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | First seen |

**Write path:** `POST /api/book` upserts on `email` conflict via Supabase service role.

---

### `public.appointments`

Core booking records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Appointment identifier |
| `customer_id` | `uuid` | NOT NULL, FK → `customers(id)` | Guest |
| `staff_id` | `uuid` | NOT NULL, FK → `staff(id)` | Assigned stylist |
| `service_id` | `uuid` | NOT NULL, FK → `services(id)` | Booked service |
| `starts_at` | `timestamptz` | NOT NULL | Start time (UTC stored) |
| `ends_at` | `timestamptz` | NOT NULL | End time; must be `> starts_at` |
| `status` | `appointment_status` | NOT NULL, default `confirmed` | Lifecycle state |
| `notes` | `text` | nullable | Optional notes (unused in current UI) |
| `google_event_id` | `text` | nullable | Google Calendar event ID |
| `cancel_token_hash` | `text` | NOT NULL | SHA-256 hex hash of cancel token |
| `cancel_token_expires_at` | `timestamptz` | NOT NULL | Token valid until appointment start |
| `cancelled_at` | `timestamptz` | nullable | When cancelled |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Created |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update (trigger-maintained) |

**Check constraint:** `valid_time_range` — `ends_at > starts_at`.

**Foreign key graph:**

```text
customers ◄── appointments ──► staff
                    │
                    └──► services

staff ◄── staff_services ──► services
staff ◄── staff_availability
```

---

## Indexes

| Index | Table | Columns | Condition | Purpose |
|-------|-------|---------|-----------|---------|
| `appointments_staff_starts_at_idx` | `appointments` | `(staff_id, starts_at)` | `status = 'confirmed'` | Availability queries |
| `appointments_cancel_token_hash_idx` | `appointments` | `(cancel_token_hash)` | `status = 'confirmed'` | Cancel lookup |
| `appointments_staff_starts_at_confirmed_idx` | `appointments` | `(staff_id, starts_at)` | `status = 'confirmed'` | **UNIQUE** — prevents double-booking |

The unique partial index is the database-level guarantee that two confirmed appointments cannot share the same stylist and exact start time.

---

## Triggers

### `appointments_set_updated_at`

| Property | Value |
|----------|-------|
| Event | `BEFORE UPDATE` on `public.appointments` |
| Function | `public.set_updated_at()` |
| Behavior | Sets `updated_at = now()` on every update |

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

---

## Row-Level Security (RLS)

RLS is **enabled** on all seven public tables. Policies are defined only for catalog/read tables; sensitive tables rely on **deny-by-default** (no policies = no anon/authenticated access).

### Policies (anonymous SELECT)

| Table | Policy name | Operation | Rule |
|-------|-------------|-----------|------|
| `services` | Public read active services | SELECT | `is_active = true` |
| `staff` | Public read active staff | SELECT | `is_active = true` |
| `staff_services` | Public read staff_services | SELECT | `true` |
| `business_hours` | Public read business_hours | SELECT | `true` |
| `staff_availability` | Public read staff_availability | SELECT | `true` |

### Tables with RLS but no public policies

| Table | Effective access (anon key) | Actual writes |
|-------|----------------------------|---------------|
| `customers` | **Denied** | Service role via `/api/book` |
| `appointments` | **Denied** | Service role via `/api/book`, `/api/cancel` |

The Next.js API routes use `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS entirely.

---

## Seed Data Summary

Migration `002_seed_data.sql` populates:

- 9 services with durations, buffers, and prices
- 4 staff members with titles and bios
- `staff_services` links (e.g. Vicky/Jordan/Sofia → cuts & blowout; Maria/Sofia → color services; Maria/Sofia → Perm)
- Default `business_hours` for all seven days

Migration `003_add_perm_service.sql` is idempotent for environments that ran 002 before Perm existed.

Migration `004_rename_alex_to_vicky.sql` renames legacy seed stylist "Alex Kim" → "Vicky".

---

## Entity Relationship Diagram

```text
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│  services   │◄──────│ staff_services  │──────►│    staff    │
└──────┬──────┘       └─────────────────┘       └──────┬──────┘
       │                                                │
       │         ┌─────────────────┐                    │
       │         │ staff_availability                   │
       │         └────────┬────────┘                    │
       │                  │                             │
       ▼                  ▼                             ▼
┌─────────────┐    ┌──────────────┐              ┌─────────────┐
│appointments │───►│  customers   │              │business_hours│
└─────────────┘    └──────────────┘              └─────────────┘
       │
       │  FK: service_id, staff_id, customer_id
       └── cancel_token_hash, google_event_id, status
```

---

## Related Documents

- [architecture.md](./architecture.md) — How the app reads/writes this schema
- [features-and-logic.md](./features-and-logic.md) — Availability and booking logic using these tables
