-- Optional Supabase RPCs/views for the performance issues found in the audit.
-- Review table names and policies in Supabase before applying.

create or replace view public.study_sets_with_card_counts as
select
  s.id,
  s.title,
  s.description,
  s.created_at,
  s.author_id,
  count(c.id)::int as card_count
from public.study_sets s
left join public.cards c on c.set_id = s.id
group by s.id;

create or replace function public.group_set_progress(target_group_id uuid)
returns table (
  set_id uuid,
  user_id uuid,
  mastered_count int,
  total_count int
)
language sql
security invoker
stable
as $$
  select
    gss.set_id,
    gm.user_id,
    count(lp.card_id) filter (where lp.status = 'mastered')::int as mastered_count,
    count(c.id)::int as total_count
  from public.group_study_sets gss
  join public.group_members gm on gm.group_id = gss.group_id
  join public.cards c on c.set_id = gss.set_id
  left join public.learning_progress lp
    on lp.card_id = c.id
    and lp.user_id = gm.user_id
  where gss.group_id = target_group_id
  group by gss.set_id, gm.user_id;
$$;
