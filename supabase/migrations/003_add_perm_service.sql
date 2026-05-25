-- Add Perm service (run if 002_seed_data was applied before Perm existed)

insert into public.services (name, description, duration_minutes, buffer_minutes, price_display, sort_order)
select 'Perm', 'Body wave or straight perm', 150, 15, '$150+', 9
where not exists (select 1 from public.services where name = 'Perm');

insert into public.staff_services (staff_id, service_id)
select distinct s.id, sv.id
from public.staff s
cross join public.services sv
where s.full_name in ('Maria Santos', 'Sofia Chen')
  and sv.name = 'Perm'
on conflict (staff_id, service_id) do nothing;
