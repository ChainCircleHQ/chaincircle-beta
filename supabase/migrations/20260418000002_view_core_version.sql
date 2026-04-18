-- `circles_with_counts` was created at 20260417000005 via `select c.*` from
-- `circles`. Postgres expands * into concrete columns at view-creation time,
-- so later adding `core_version` + `status` enum expansion to `circles`
-- doesn't flow into the view. Frontend queries like
-- `.eq('core_version', 2)` hit the view and error/return empty because the
-- column isn't exposed.
--
-- This migration recreates the view so it mirrors the current circles
-- schema including core_version. Same shape as before plus the extra column.

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
