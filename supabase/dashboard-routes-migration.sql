alter table public.companies
  add column if not exists dashboard_route text not null default '/dashboard/other';

alter table public.company_members
  add column if not exists position text,
  add column if not exists dashboard_route text not null default '/dashboard/other';

update public.companies
set business_type = case business_type
  when 'Educational Center' then 'Education Center'
  when 'Healthcare / Clinic' then 'Clinic / Healthcare'
  when 'Service Company' then 'Service Business'
  when 'Production Business' then 'Manufacturing'
  when 'Производственный бизнес' then 'Manufacturing'
  else business_type
end;

update public.companies
set dashboard_route = case business_type
  when 'Retail Store' then '/dashboard/retail'
  when 'Manufacturing' then '/dashboard/bakery'
  when 'Bakery' then '/dashboard/bakery'
  when 'Education Center' then '/dashboard/education'
  when 'Restaurant / Cafe' then '/dashboard/restaurant'
  when 'Clinic / Healthcare' then '/dashboard/clinic'
  when 'Logistics' then '/dashboard/logistics'
  when 'Service Business' then '/dashboard/service'
  when 'Construction' then '/dashboard/construction'
  when 'Real Estate' then '/dashboard/real-estate'
  else '/dashboard/other'
end;

update public.company_members cm
set dashboard_route = c.dashboard_route
from public.companies c
where c.id = cm.company_id;

update public.company_members cm
set position = coalesce(cm.position, e.position)
from public.employees e
where e.company_id = cm.company_id
  and e.user_id = cm.user_id;
