-- Seed data for ALO Hair Salon (Syosset, NY)
-- Safe to re-run: staff_services and business_hours skip duplicates.

insert into public.services (name, description, duration_minutes, buffer_minutes, price_display, sort_order) values
  ('Men''s Cut', 'Classic cut and style', 30, 10, '$35+', 1),
  ('Women''s Cut', 'Cut, wash, and blow dry', 45, 10, '$55+', 2),
  ('Blowout', 'Wash and blow dry styling', 45, 10, '$45+', 3),
  ('Single Process Color', 'Full head color application', 90, 15, '$95+', 4),
  ('Partial Highlights', 'Partial foil highlights', 120, 15, '$120+', 5),
  ('Full Highlights', 'Full foil highlights', 150, 15, '$165+', 6),
  ('Balayage', 'Hand-painted color technique', 180, 15, '$200+', 7),
  ('Keratin Treatment', 'Smoothing keratin treatment', 120, 15, '$250+', 8),
  ('Perm', 'Body wave or straight perm', 150, 15, '$150+', 9);

insert into public.staff (full_name, title, bio, sort_order) values
  ('Alex Kim', 'Senior Stylist', 'Specializes in precision cuts and modern styles.', 1),
  ('Maria Santos', 'Color Specialist', 'Expert in balayage, highlights, and color correction.', 2),
  ('Jordan Lee', 'Stylist', 'Great with men''s cuts and everyday styling.', 3),
  ('Sofia Chen', 'Master Stylist', 'Over 15 years of experience in cuts and color.', 4);

-- Link staff to services (single query — avoids duplicate Sofia Chen rows)
insert into public.staff_services (staff_id, service_id)
select distinct s.id, sv.id
from public.staff s
cross join public.services sv
where
  (
    s.full_name in ('Alex Kim', 'Jordan Lee', 'Sofia Chen')
    and sv.name in ('Men''s Cut', 'Women''s Cut', 'Blowout')
  )
  or (
    s.full_name in ('Maria Santos', 'Sofia Chen')
    and sv.name in (
      'Single Process Color',
      'Partial Highlights',
      'Full Highlights',
      'Balayage',
      'Women''s Cut',
      'Blowout'
    )
  )
  or (s.full_name = 'Sofia Chen' and sv.name = 'Keratin Treatment')
  or (
    s.full_name in ('Maria Santos', 'Sofia Chen')
    and sv.name = 'Perm'
  )
on conflict (staff_id, service_id) do nothing;

-- Business hours: Mon-Sat open, Sun closed (0=Sun, 1=Mon, ...)
insert into public.business_hours (day_of_week, opens_at, closes_at, is_closed) values
  (0, '09:00', '17:00', true),
  (1, '09:00', '19:00', false),
  (2, '09:00', '19:00', false),
  (3, '09:00', '19:00', false),
  (4, '09:00', '20:00', false),
  (5, '09:00', '20:00', false),
  (6, '09:00', '17:00', false)
on conflict (day_of_week) do nothing;
