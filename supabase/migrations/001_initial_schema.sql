-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Enums
create type appointment_status as enum ('confirmed', 'cancelled', 'completed');

-- Services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  buffer_minutes int not null default 0 check (buffer_minutes >= 0),
  price_display text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Staff
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  bio text,
  photo_url text,
  google_calendar_id text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Which stylists perform which services
create table public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

-- Salon-level business hours (America/New_York)
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_closed boolean not null default false,
  unique (day_of_week)
);

-- Optional per-stylist hour overrides
create table public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  unique (staff_id, day_of_week)
);

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  staff_id uuid not null references public.staff(id),
  service_id uuid not null references public.services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'confirmed',
  notes text,
  google_event_id text,
  cancel_token_hash text not null,
  cancel_token_expires_at timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (ends_at > starts_at)
);

create index appointments_staff_starts_at_idx
  on public.appointments (staff_id, starts_at)
  where status = 'confirmed';

create index appointments_cancel_token_hash_idx
  on public.appointments (cancel_token_hash)
  where status = 'confirmed';

create unique index appointments_staff_starts_at_confirmed_idx
  on public.appointments (staff_id, starts_at)
  where status = 'confirmed';

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.staff_services enable row level security;
alter table public.business_hours enable row level security;
alter table public.staff_availability enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;

create policy "Public read active services"
  on public.services for select using (is_active = true);

create policy "Public read active staff"
  on public.staff for select using (is_active = true);

create policy "Public read staff_services"
  on public.staff_services for select using (true);

create policy "Public read business_hours"
  on public.business_hours for select using (true);

create policy "Public read staff_availability"
  on public.staff_availability for select using (true);
