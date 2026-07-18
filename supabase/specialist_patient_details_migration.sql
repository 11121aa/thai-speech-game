-- ============================================================
-- Let specialists see their linked patients' avatar/gender/age
-- Run in Supabase SQL Editor
-- ============================================================
-- list_linked_patients_for_specialist() only returned user_id/email/
-- username — extend it to also return gender/age/avatar fields so
-- management.html can show them in the patient list and detail view.
-- Postgres won't let create-or-replace change a function's return row
-- shape, so drop it first.
-- ============================================================

drop function if exists public.list_linked_patients_for_specialist();

create or replace function public.list_linked_patients_for_specialist()
returns table (
  user_id uuid, email text, username text, gender text, age smallint,
  avatar_url text, avatar_emoji text, avatar_color text, avatar_color2 text
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email, p.username, p.gender, p.age,
         p.avatar_url, p.avatar_emoji, p.avatar_color, p.avatar_color2
  from public.therapist_links tl
  join auth.users u on u.id = tl.patient_user_id
  left join public.profiles p on p.user_id = u.id
  where tl.specialist_user_id = auth.uid()
  order by coalesce(p.username, u.email);
$$;

grant execute on function public.list_linked_patients_for_specialist() to authenticated;
