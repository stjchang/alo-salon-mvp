-- Track client IP on appointments for booking rate limiting

alter table public.appointments
  add column if not exists client_ip inet;

create index if not exists appointments_client_ip_created_at_idx
  on public.appointments (client_ip, created_at desc)
  where client_ip is not null;
