-- Apply once in a new Supabase project. This migration never resets data.
begin;

create function public.valid_homework_questions(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare q jsonb;
begin
  if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) not between 1 and 20 then return false; end if;
  if (select count(distinct item->>'id') from jsonb_array_elements(value) item) <> jsonb_array_length(value) then return false; end if;
  for q in select * from jsonb_array_elements(value) loop
    if not (q ?& array['id','type','prompt','answer','explanation','points']) then return false; end if;
    if q->>'type' not in ('multiple_choice','short_answer','calculation','true_false','fill_blank') then return false; end if;
    if length(trim(q->>'id')) not between 1 and 100 or length(trim(q->>'prompt')) not between 1 and 4000
      or length(trim(q->>'answer')) not between 1 and 4000 or length(trim(q->>'explanation')) not between 1 and 4000 then return false; end if;
    if jsonb_typeof(q->'points') <> 'number' or (q->>'points')::numeric <> trunc((q->>'points')::numeric)
      or (q->>'points')::numeric not between 1 and 20 then return false; end if;
    if q->>'type' = 'multiple_choice' then
      if jsonb_typeof(q->'options') is distinct from 'array' then return false; end if;
      if jsonb_array_length(q->'options') not between 2 and 6 or not (q->'options' ? (q->>'answer')) then return false; end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create table public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 100),
  school text not null check (length(trim(school)) between 2 and 150),
  aimag_or_district text not null check (length(trim(aimag_or_district)) between 2 and 100),
  subjects text[] not null check (cardinality(subjects) between 1 and 20),
  grades int[] not null check (cardinality(grades) between 1 and 12 and grades <@ array[1,2,3,4,5,6,7,8,9,10,11,12]),
  created_at timestamptz not null default now()
);

create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.teachers(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  subject text not null check (length(trim(subject)) between 1 and 80),
  grade int not null check (grade between 1 and 12),
  topic text not null check (length(trim(topic)) between 1 and 200),
  curriculum_unit text check (length(curriculum_unit) <= 200),
  set_type text not null check (set_type in ('in_class', 'homework')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  questions jsonb not null check (public.valid_homework_questions(questions)),
  source_type text not null check (source_type in ('pdf', 'voice', 'text', 'copied')),
  copied_from_id uuid references public.exercise_sets(id) on delete set null,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  copy_count int not null default 0 check (copy_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercise_sets_library_idx on public.exercise_sets(visibility, subject, grade, created_at desc);
create index exercise_sets_owner_idx on public.exercise_sets(owner_id, created_at desc);
create index exercise_sets_copied_idx on public.exercise_sets(copied_from_id);

create table public.lesson_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.teachers(id) on delete cascade,
  subject text not null, grade int not null check (grade between 1 and 12), topic text not null,
  input_text text not null default '' check (length(input_text) <= 20000),
  pdf_path text,
  in_class_set_id uuid references public.exercise_sets(id) on delete set null,
  homework_set_id uuid references public.exercise_sets(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lesson_generations_owner_idx on public.lesson_generations(owner_id);

create table public.ratings (
  set_id uuid not null references public.exercise_sets(id) on delete cascade,
  teacher_id uuid not null default auth.uid() references public.teachers(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  primary key (set_id, teacher_id)
);

alter table public.teachers enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.lesson_generations enable row level security;
alter table public.ratings enable row level security;

create policy teachers_read on public.teachers for select to authenticated using (true);
create policy teachers_edit on public.teachers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy sets_read on public.exercise_sets for select to authenticated using (visibility = 'public' or owner_id = (select auth.uid()));
create policy sets_insert on public.exercise_sets for insert to authenticated with check (owner_id = (select auth.uid()) and copied_from_id is null and source_type <> 'copied' and copy_count = 0);
create policy sets_edit on public.exercise_sets for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy sets_delete on public.exercise_sets for delete to authenticated using (owner_id = (select auth.uid()));
create policy generations_read on public.lesson_generations for select to authenticated using (owner_id = (select auth.uid()));
create policy ratings_read on public.ratings for select to authenticated using (
  exists(select 1 from public.exercise_sets s where s.id = set_id)
);
create policy ratings_insert on public.ratings for insert to authenticated with check (
  teacher_id = (select auth.uid()) and exists(select 1 from public.exercise_sets s where s.id = set_id and s.visibility = 'public')
);
create policy ratings_update on public.ratings for update to authenticated using (teacher_id = (select auth.uid())) with check (
  teacher_id = (select auth.uid()) and exists(select 1 from public.exercise_sets s where s.id = set_id and s.visibility = 'public')
);

-- Restrict counters and ownership even when clients call the Data API directly.
revoke all on public.teachers, public.exercise_sets, public.lesson_generations, public.ratings from anon, authenticated;
grant select on public.teachers, public.exercise_sets, public.lesson_generations, public.ratings to authenticated;
grant update (full_name, school, aimag_or_district, subjects, grades) on public.teachers to authenticated;
grant insert (owner_id, title, subject, grade, topic, curriculum_unit, set_type, difficulty, questions, source_type, visibility) on public.exercise_sets to authenticated;
grant update (title, subject, grade, topic, curriculum_unit, difficulty, questions, visibility) on public.exercise_sets to authenticated;
grant delete on public.exercise_sets to authenticated;
grant insert (set_id, teacher_id, stars), update (stars) on public.ratings to authenticated;

create function public.create_teacher_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.teachers(id, full_name, school, aimag_or_district, subjects, grades)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'school',
    new.raw_user_meta_data->>'aimag_or_district',
    array(select jsonb_array_elements_text(new.raw_user_meta_data->'subjects')),
    array(select jsonb_array_elements_text(new.raw_user_meta_data->'grades')::int));
  return new;
end;
$$;
create trigger homework_teacher_created after insert on auth.users for each row execute function public.create_teacher_profile();

create function public.touch_exercise_set() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger homework_set_updated before update on public.exercise_sets for each row execute function public.touch_exercise_set();

create view public.exercise_set_details with (security_invoker = true) as
select s.*, t.full_name as author_name, t.school as author_school,
  coalesce(r.rating_average, 0)::float8 as rating_average, coalesce(r.rating_count, 0)::int as rating_count
from public.exercise_sets s join public.teachers t on t.id = s.owner_id
left join (select set_id, avg(stars) as rating_average, count(*) as rating_count from public.ratings group by set_id) r on r.set_id = s.id;
revoke all on public.exercise_set_details from anon;
grant select on public.exercise_set_details to authenticated;

create function public.copy_exercise_set(source_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare source public.exercise_sets; new_id uuid; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into source from public.exercise_sets where id = source_id and (visibility = 'public' or owner_id = caller) for update;
  if not found then raise exception 'Set not found' using errcode = '42501'; end if;
  insert into public.exercise_sets(owner_id, title, subject, grade, topic, curriculum_unit, set_type, difficulty, questions, source_type, copied_from_id, visibility)
  values (caller, source.title, source.subject, source.grade, source.topic, source.curriculum_unit, source.set_type, source.difficulty, source.questions, 'copied', source.id, 'private') returning id into new_id;
  update public.exercise_sets set copy_count = copy_count + 1 where id = source.id;
  return new_id;
end;
$$;

-- Save both edited sets and their lesson together. No partial two-set saves.
create function public.save_lesson_generation(payload jsonb) returns table(in_class_set_id uuid, homework_set_id uuid)
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); lesson jsonb := payload->'input'; generated jsonb := payload->'generated'; class_id uuid; home_id uuid; source text;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  source := case when nullif(lesson->>'pdfFileId','') is not null then 'pdf' else coalesce(lesson->>'sourceType','text') end;
  if source not in ('pdf','voice','text') then raise exception 'Invalid source'; end if;
  if source = 'pdf' and not exists (select 1 from storage.objects where bucket_id = 'lesson-pdfs' and name = lesson->>'pdfFileId' and (storage.foldername(name))[1] = caller::text) then
    raise exception 'Invalid PDF' using errcode = '42501';
  end if;
  insert into public.exercise_sets(owner_id, title, subject, grade, topic, set_type, difficulty, questions, source_type, visibility)
  values(caller, generated->>'title', lesson->>'subject', (lesson->>'grade')::int, lesson->>'topic', 'in_class', lesson->>'difficulty', generated->'in_class', source, payload->>'visibility') returning id into class_id;
  insert into public.exercise_sets(owner_id, title, subject, grade, topic, set_type, difficulty, questions, source_type, visibility)
  values(caller, generated->>'title', lesson->>'subject', (lesson->>'grade')::int, lesson->>'topic', 'homework', lesson->>'difficulty', generated->'homework', source, payload->>'visibility') returning id into home_id;
  insert into public.lesson_generations(owner_id, subject, grade, topic, input_text, pdf_path, in_class_set_id, homework_set_id)
  values(caller, lesson->>'subject', (lesson->>'grade')::int, lesson->>'topic', coalesce(lesson->>'inputText',''), lesson->>'pdfFileId', class_id, home_id);
  return query select class_id, home_id;
end;
$$;

revoke all on function public.create_teacher_profile(), public.touch_exercise_set(), public.copy_exercise_set(uuid), public.save_lesson_generation(jsonb) from public, anon, authenticated;
grant execute on function public.copy_exercise_set(uuid), public.save_lesson_generation(jsonb) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-pdfs', 'lesson-pdfs', false, 10485760, array['application/pdf']);
create policy homework_pdf_insert on storage.objects for insert to authenticated with check (bucket_id = 'lesson-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy homework_pdf_read on storage.objects for select to authenticated using (bucket_id = 'lesson-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy homework_pdf_delete on storage.objects for delete to authenticated using (bucket_id = 'lesson-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
