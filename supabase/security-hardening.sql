-- Apply once to existing environments after the base schema.
-- Prevent authenticated users from granting themselves a role in any company.

drop policy if exists "Users can join companies" on public.company_members;
drop policy if exists "Creators can claim own companies" on public.company_members;

create policy "Creators can claim own companies"
on public.company_members
for insert
with check (
  user_id = auth.uid()
  and role = 'founder'::public.member_role
  and exists (
    select 1
    from public.companies
    where companies.id = company_members.company_id
      and companies.created_by = auth.uid()
  )
);

-- Existing manager approval remains protected by the separate
-- "Managers can approve memberships" policy.
