-- Rename first stylist from legacy seed name to Vicky (owner)

update public.staff
set
  full_name = 'Vicky',
  title = 'Owner & Master Stylist',
  bio = 'Precision cuts, color, perms, and Japanese straightening.'
where full_name = 'Alex Kim';
