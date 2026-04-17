-- Views/aggregates the frontend reads during Phase 5. Cheaper than doing
-- GROUP BY + subquery in every hook.

begin;

-- Circle plus live member count + computed unix timestamps (frontend
-- hooks expect Number(createdAt), which was block.timestamp pre-Phase 5).
create or replace view public.circles_with_counts as
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

-- Global stats for the landing page — single row. Matches the shape of
-- useGlobalStats() so the hook just does `.maybeSingle()`.
create or replace view public.global_stats as
select
    (select count(*) from public.circles)::int                                as total_circles,
    (select count(*) from public.circles where status = 1)::int               as active_circles,
    coalesce((select sum(contribution_amount * member_cap) from public.circles where status in (1, 2)), 0)::numeric as total_pooled_raw,
    (select count(*) from public.users)::int                                  as total_users;

grant select on public.global_stats to anon, authenticated;

commit;
