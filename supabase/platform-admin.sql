insert into public.platform_admins (user_id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
where lower(email) = lower('BekbergenBekbolat0@gmail.com')
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
