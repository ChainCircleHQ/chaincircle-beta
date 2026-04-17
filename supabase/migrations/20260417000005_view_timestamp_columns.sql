-- Adds computed unix-timestamp columns to circles_with_counts so frontend
-- hooks can pass Number(createdAt) the way the old on-chain hook did.

begin;

drop view if exists public.circles_with_counts;

create view public.circles_with_counts as
select
    c.*,
    coalesce(
        (select count(*) from public.circle_members m where m.circle_id = c.circle_id),
        0
    )::int                                                as member_count,
    extract(epoch from c.created_at)::bigint              as created_ts,
    extract(epoch from c.started_at)::bigint              as started_ts,
    extract(epoch from c.completed_at)::bigint            as completed_ts
from public.circles c;

grant select on public.circles_with_counts to anon, authenticated;

commit;
