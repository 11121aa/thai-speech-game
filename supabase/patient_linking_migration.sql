-- ============================================================
-- Patient-therapist linking migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================
-- Previously ANY specialist could see EVERY patient's data (practice
-- recordings, activity, homework) — a privacy problem once more than one
-- therapist uses the same app instance. From now on, a specialist can
-- only see a patient after the patient shares their personal code and the
-- specialist enters it:
--   1. Every account gets a random patient_code (profiles.patient_code)
--   2. The patient shares that code with their therapist
--   3. The therapist enters it (link_patient_by_code RPC) — this is the
--      ONLY way a therapist_links row gets created
--   4. Every place that used to check "is this caller a specialist"
--      (to grant access to some OTHER user's row) now also checks
--      "is that other user linked to this specialist" via
--      is_linked_patient() below
-- ============================================================

-- ------------------------------------------------------------
-- 1. patient_code — every profile gets one (harmless if unused on
--    specialist accounts); a short unique code, auto-generated.
-- ------------------------------------------------------------

create or replace function public.generate_patient_code()
returns text
language sql
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

alter table public.profiles add column if not exists patient_code text;
alter table public.profiles alter column patient_code set default public.generate_patient_code();

-- Backfill any existing rows created before this migration.
update public.profiles set patient_code = public.generate_patient_code() where patient_code is null;

alter table public.profiles drop constraint if exists profiles_patient_code_unique;
alter table public.profiles add constraint profiles_patient_code_unique unique (patient_code);

-- ------------------------------------------------------------
-- 2. therapist_links — the actual linking table. No direct insert
--    policy: every link is created through link_patient_by_code() below,
--    which validates the caller is a specialist and the code is real.
-- ------------------------------------------------------------

create table if not exists public.therapist_links (
  id bigserial primary key,
  specialist_user_id uuid not null references auth.users (id) on delete cascade,
  patient_user_id uuid not null references auth.users (id) on delete cascade,
  linked_at timestamptz not null default now(),
  unique (specialist_user_id, patient_user_id)
);

alter table public.therapist_links enable row level security;

drop policy if exists "therapist_links_select_own" on public.therapist_links;
create policy "therapist_links_select_own" on public.therapist_links
  for select using (auth.uid() = specialist_user_id or auth.uid() = patient_user_id);

-- ------------------------------------------------------------
-- 3. is_linked_patient() — security definer so it can be used inside
--    other tables' RLS policies without recursion issues.
-- ------------------------------------------------------------

create or replace function public.is_linked_patient(specialist uuid, patient uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.therapist_links tl
    where tl.specialist_user_id = specialist and tl.patient_user_id = patient
  );
$$;

-- ------------------------------------------------------------
-- 4. link_patient_by_code() — the only way a link gets created. Returns
--    false (not an error) for "wrong code" — same anti-enumeration
--    principle as username_to_email.
-- ------------------------------------------------------------

create or replace function public.link_patient_by_code(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_patient uuid;
begin
  if not public.is_specialist(auth.uid()) then
    return false;
  end if;

  select user_id into target_patient
  from public.profiles
  where upper(patient_code) = upper(code);

  if target_patient is null then
    return false;
  end if;

  insert into public.therapist_links (specialist_user_id, patient_user_id)
  values (auth.uid(), target_patient)
  on conflict (specialist_user_id, patient_user_id) do nothing;

  return true;
end;
$$;

grant execute on function public.link_patient_by_code(text) to authenticated;

-- ------------------------------------------------------------
-- 5. list_linked_patients_for_specialist() replaces
--    list_users_for_specialist() (dropped — it returned EVERY user,
--    which is exactly the hole this migration closes).
-- ------------------------------------------------------------

drop function if exists public.list_users_for_specialist();

create or replace function public.list_linked_patients_for_specialist()
returns table (user_id uuid, email text, username text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email, p.username
  from public.therapist_links tl
  join auth.users u on u.id = tl.patient_user_id
  left join public.profiles p on p.user_id = u.id
  where tl.specialist_user_id = auth.uid()
  order by coalesce(p.username, u.email);
$$;

grant execute on function public.list_linked_patients_for_specialist() to authenticated;

-- ------------------------------------------------------------
-- 6. Re-scope every existing "specialist sees everything" policy to
--    "specialist sees only linked patients".
-- ------------------------------------------------------------

drop policy if exists "role_select_own_or_specialist" on public.role;
create policy "role_select_own_or_specialist" on public.role
  for select using (auth.uid() = user_id or public.is_linked_patient(auth.uid(), user_id));

drop policy if exists "practice_select_own_or_specialist" on public.practice;
create policy "practice_select_own_or_specialist" on public.practice
  for select using (auth.uid() = user_id or public.is_linked_patient(auth.uid(), user_id));

drop policy if exists "practice_update_specialist" on public.practice;
create policy "practice_update_specialist" on public.practice
  for update using (public.is_linked_patient(auth.uid(), user_id))
  with check (public.is_linked_patient(auth.uid(), user_id));

drop policy if exists "activity_select_own_or_specialist" on public.activity;
create policy "activity_select_own_or_specialist" on public.activity
  for select using (auth.uid() = user_id or public.is_linked_patient(auth.uid(), user_id));

drop policy if exists "practice_audio_select_own_or_specialist" on storage.objects;
create policy "practice_audio_select_own_or_specialist" on storage.objects
  for select using (
    bucket_id = 'practice-audio'
    and (auth.uid()::text = (storage.foldername(name))[1]
         or public.is_linked_patient(auth.uid(), ((storage.foldername(name))[1])::uuid))
  );

drop policy if exists "practice_audio_delete_own_or_specialist" on storage.objects;
create policy "practice_audio_delete_own_or_specialist" on storage.objects
  for delete using (
    bucket_id = 'practice-audio'
    and (auth.uid()::text = (storage.foldername(name))[1]
         or public.is_linked_patient(auth.uid(), ((storage.foldername(name))[1])::uuid))
  );

-- Homework templates (word list + repeat count) — scoped to their
-- creator, so one specialist can no longer edit/delete another's
-- templates. (Patients already have their own separate SELECT policies
-- for homework/homework_words assigned to them, from homework_patient_rls.sql
-- — those are unaffected by this change.)
drop policy if exists "specialist manage homework" on public.homework;
create policy "specialist manage own homework" on public.homework
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "specialist manage homework_words" on public.homework_words;
create policy "specialist manage own homework_words" on public.homework_words
  for all using (
    exists (select 1 from public.homework h where h.id = homework_id and h.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.homework h where h.id = homework_id and h.created_by = auth.uid())
  );

-- Assignments — a specialist can only assign/view/edit homework
-- assignments for patients linked to them.
drop policy if exists "specialist manage assignments" on public.homework_assignments;
create policy "specialist manage linked assignments" on public.homework_assignments
  for all using (public.is_linked_patient(auth.uid(), patient_user_id))
  with check (public.is_linked_patient(auth.uid(), patient_user_id));

-- Per-word homework feedback notes — scoped via the assignment's patient.
drop policy if exists "specialist manage hw_feedback" on public.homework_word_feedback;
create policy "specialist manage linked hw_feedback" on public.homework_word_feedback
  for all using (
    exists (
      select 1 from public.homework_assignments ha
      where ha.id = homework_assignment_id
        and public.is_linked_patient(auth.uid(), ha.patient_user_id)
    )
  )
  with check (
    exists (
      select 1 from public.homework_assignments ha
      where ha.id = homework_assignment_id
        and public.is_linked_patient(auth.uid(), ha.patient_user_id)
    )
  );

-- ------------------------------------------------------------
-- Done. Existing specialist accounts start with ZERO linked patients —
-- they'll need each patient's code entered once via the new "link
-- patient" box in management.html before that patient shows up again.
-- ------------------------------------------------------------
