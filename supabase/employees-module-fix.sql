drop policy if exists "Admins can update employees" on public.employees;
drop policy if exists "Admins can delete employees" on public.employees;
drop policy if exists "Managers can update employees" on public.employees;
drop policy if exists "Managers can delete employees" on public.employees;

create policy "Managers can update employees"
on public.employees
for update
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can delete employees"
on public.employees
for delete
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

notify pgrst, 'reload schema';
