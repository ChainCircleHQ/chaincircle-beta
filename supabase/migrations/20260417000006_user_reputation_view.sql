-- Off-chain reputation — Phase 5.6
--
-- Background: the deployed ChainCircleCore bytecode doesn't actually call
-- ReputationManager on contribution/payout (pre-integration version; see
-- GAPS.md §2.3). That means on-chain getUserReputation() always returns 0.
-- We compute reputation here from the indexed event stream so users see
-- meaningful scores today. When ChainCircleCore gets redeployed in Phase 6,
-- the on-chain version becomes authoritative and this view moves to "historical
-- estimate" status.
--
-- Rule mirror (from ReputationManager.sol):
--   ON_TIME_PAYMENT    = 15    per contribution event
--   COMPLETE_CYCLE     = 250   per circle completed (status = 2)
--   SUBSEQUENT_CYCLE   = 100   per circle joined beyond the first
--   PAYOUT_RECEIVED    = 25    per payout received
--   STREAK_BONUS       = 50    per 5 consecutive contributions
--
-- On-time tracking limitation: the ContributionMade event doesn't carry an
-- onTime bool, so historical contributions are treated as on-time. Going
-- forward we could compute it from block_timestamp vs the circle's expected
-- round deadline. Not done yet.
--
-- Tier thresholds:
--   0-499   None
--   500-699 Bronze
--   700-849 Silver
--   850+    Gold

begin;

create or replace view public.user_reputation as
with contribution_stats as (
    select
        user_address,
        count(*) as n_contributions
    from public.contributions
    group by user_address
),
payout_stats as (
    select
        recipient_address as user_address,
        count(*) as n_payouts
    from public.payouts
    group by recipient_address
),
membership_stats as (
    select
        cm.user_address,
        count(distinct cm.circle_id) as n_circles_joined,
        count(distinct cm.circle_id) filter (where c.status = 2) as n_circles_completed
    from public.circle_members cm
    join public.circles c on c.circle_id = cm.circle_id
    group by cm.user_address
),
account_ages as (
    select
        user_address,
        min(block_timestamp) as first_action_at
    from (
        select user_address, block_timestamp from public.contributions
        union all
        select recipient_address, block_timestamp from public.payouts
    ) all_actions
    group by user_address
)
select
    u.address,
    u.display_name,
    coalesce(cs.n_contributions, 0)              as total_contributions_count,
    coalesce(ps.n_payouts, 0)                    as total_payouts_count,
    coalesce(ms.n_circles_joined, 0)             as circles_joined,
    coalesce(ms.n_circles_completed, 0)          as circles_completed,
    aa.first_action_at,
    extract(epoch from aa.first_action_at)::bigint as first_action_ts,
    -- Score calculation
    (
        coalesce(cs.n_contributions, 0) * 15
        + coalesce(ms.n_circles_completed, 0) * 250
        + greatest(0, coalesce(ms.n_circles_joined, 0) - 1) * 100
        + coalesce(ps.n_payouts, 0) * 25
    )::int as score,
    -- Tier (derived from score)
    case
        when (
            coalesce(cs.n_contributions, 0) * 15
            + coalesce(ms.n_circles_completed, 0) * 250
            + greatest(0, coalesce(ms.n_circles_joined, 0) - 1) * 100
            + coalesce(ps.n_payouts, 0) * 25
        ) >= 850 then 'Gold'
        when (
            coalesce(cs.n_contributions, 0) * 15
            + coalesce(ms.n_circles_completed, 0) * 250
            + greatest(0, coalesce(ms.n_circles_joined, 0) - 1) * 100
            + coalesce(ps.n_payouts, 0) * 25
        ) >= 700 then 'Silver'
        when (
            coalesce(cs.n_contributions, 0) * 15
            + coalesce(ms.n_circles_completed, 0) * 250
            + greatest(0, coalesce(ms.n_circles_joined, 0) - 1) * 100
            + coalesce(ps.n_payouts, 0) * 25
        ) >= 500 then 'Bronze'
        else 'None'
    end as tier,
    -- Sum of contribution amounts (base units, CUSD has 6 decimals)
    coalesce(
        (select sum(c.amount) from public.contributions c where c.user_address = u.address),
        0
    )::numeric as total_contributions_amount,
    coalesce(
        (select sum(p.amount) from public.payouts p where p.recipient_address = u.address),
        0
    )::numeric as total_payouts_amount
from public.users u
left join contribution_stats cs on cs.user_address = u.address
left join payout_stats ps       on ps.user_address = u.address
left join membership_stats ms   on ms.user_address = u.address
left join account_ages aa       on aa.user_address = u.address;

grant select on public.user_reputation to anon, authenticated;

-- Convenience index on the underlying tables so the view stays snappy at scale.
-- Most already exist (see init_schema.sql), but double-check composite lookups.
create index if not exists contributions_user_block_idx on public.contributions (user_address, block_number);
create index if not exists payouts_recipient_block_idx on public.payouts (recipient_address, block_number);

commit;
