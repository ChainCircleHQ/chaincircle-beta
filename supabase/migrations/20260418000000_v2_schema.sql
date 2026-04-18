-- ChainCircle v2 event/state extensions.
-- Non-breaking: every addition is a new column or new table. v1 rows still
-- read fine. The indexer routes events to the right shape based on which
-- contract address emitted them (via indexer_state.contract_name).

begin;

-- ---------- Per-event extensions to existing tables ----------

-- round index on contributions (nullable for v1 rows that don't carry it).
alter table public.contributions
    add column if not exists round smallint,
    add column if not exists on_time boolean;

-- v2 withdrawals ship with a destination (which may be on a different chain
-- than where the accrual happened, hence chain_id).
alter table public.payouts
    add column if not exists destination_address text,
    add column if not exists destination_chain_id bigint;

-- reputation events gain circle+round correlation so we can show "earned
-- 50 pts for streak bonus in circle #42 round 3" in the timeline UI.
alter table public.reputation_events
    add column if not exists circle_id bigint,
    add column if not exists round smallint;

-- Governance votes track weighting (Silver=1, Gold=2).
alter table public.governance_votes
    add column if not exists weight smallint;

-- ---------- New tables ----------

-- Accrued-but-unwithdrawn payouts. Populated by PayoutAccrued; cleared when
-- the matching PayoutWithdrawn lands. Drives the "You have $X pending" UI.
create table if not exists public.payouts_accrued (
    tx_hash         text primary key check (length(tx_hash) = 66),
    circle_id       bigint not null references public.circles(circle_id) on delete cascade,
    recipient_address text not null references public.users(address),
    principal       numeric(38, 0) not null,
    interest        numeric(38, 0) not null default 0,
    round           smallint not null,
    withdrawn       boolean not null default false,
    withdrawn_tx    text,
    block_number    bigint not null,
    block_timestamp timestamptz not null,
    created_at      timestamptz not null default now()
);
create index if not exists payouts_accrued_recipient_idx on public.payouts_accrued (recipient_address, withdrawn);
create index if not exists payouts_accrued_circle_idx    on public.payouts_accrued (circle_id);

-- Cross-chain payout relay intents. Destination chain != Push = delivery
-- goes through Push UEA relay. relay_status tracks it; updated out-of-band.
create table if not exists public.cross_chain_payouts (
    tx_hash              text primary key check (length(tx_hash) = 66),
    recipient_address    text not null references public.users(address),
    destination_chain_id bigint not null,
    amount               numeric(38, 0) not null,
    ref                  text,
    relay_status         text not null default 'pending'
        check (relay_status in ('pending','relayed','delivered','failed')),
    block_number         bigint not null,
    block_timestamp      timestamptz not null,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);
create index if not exists xchain_payouts_recipient_idx on public.cross_chain_payouts (recipient_address);
create index if not exists xchain_payouts_status_idx    on public.cross_chain_payouts (relay_status);

create trigger cross_chain_payouts_updated_at
    before update on public.cross_chain_payouts
    for each row execute function public.set_updated_at();

-- Badge tier change history — one row per crossing. Lets UI render a nice
-- timeline without replaying every ScoreChanged event.
create table if not exists public.tier_changes (
    id              bigserial primary key,
    user_address    text not null references public.users(address),
    from_tier       text,
    to_tier         text not null,
    score_after     int not null,
    tx_hash         text not null,
    block_number    bigint not null,
    block_timestamp timestamptz not null,
    unique (tx_hash, user_address)
);
create index if not exists tier_changes_user_idx on public.tier_changes (user_address, block_timestamp desc);

-- Circle lifecycle log — started, paused, unpaused, cancelled, completed.
-- Circles table retains current status; this table is the history.
create table if not exists public.circle_events (
    id              bigserial primary key,
    circle_id       bigint not null references public.circles(circle_id) on delete cascade,
    event_type      text not null check (event_type in ('started','paused','unpaused','cancelled','completed')),
    reason          text,
    tx_hash         text not null,
    block_number    bigint not null,
    block_timestamp timestamptz not null,
    unique (tx_hash, event_type)
);
create index if not exists circle_events_circle_idx on public.circle_events (circle_id, block_timestamp desc);

-- Governance proposals (separate from governance_votes which tracks per-vote).
create table if not exists public.governance_proposals (
    proposal_id       bigint primary key,
    circle_id         bigint references public.circles(circle_id) on delete set null,
    proposer_address  text not null references public.users(address),
    kind              text not null check (kind in ('early_exit','cancel_circle')),
    target_address    text,
    reduction_bps     int not null default 0,
    justification     text,
    deadline          timestamptz not null,
    yes_weight        int not null default 0,
    no_weight         int not null default 0,
    status            text not null default 'pending'
        check (status in ('pending','passed','failed','executed')),
    executed_at       timestamptz,
    created_block     bigint not null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index if not exists gov_proposals_circle_idx on public.governance_proposals (circle_id);
create index if not exists gov_proposals_status_idx on public.governance_proposals (status);

create trigger governance_proposals_updated_at
    before update on public.governance_proposals
    for each row execute function public.set_updated_at();

-- ---------- Circle contract-version tracking ----------
-- Existing contract_address column on circles already stores the core address.
-- Views that join rows across v1/v2 can filter on that. Adding a named
-- generated column for easier querying + a partial index.

alter table public.circles
    add column if not exists core_version smallint;

-- Backfill: existing rows are all v1 (one core address before the v2 deploy).
-- New rows get core_version set by the indexer based on the emitting address.
update public.circles set core_version = 1 where core_version is null;

-- ---------- RLS policies for new tables ----------

alter table public.payouts_accrued       enable row level security;
alter table public.cross_chain_payouts   enable row level security;
alter table public.tier_changes          enable row level security;
alter table public.circle_events         enable row level security;
alter table public.governance_proposals  enable row level security;

create policy "public read payouts_accrued"      on public.payouts_accrued       for select using (true);
create policy "public read cross_chain_payouts"  on public.cross_chain_payouts   for select using (true);
create policy "public read tier_changes"         on public.tier_changes          for select using (true);
create policy "public read circle_events"        on public.circle_events         for select using (true);
create policy "public read governance_proposals" on public.governance_proposals  for select using (true);

-- ---------- Seed indexer_state for v2 contracts ----------
-- deploy_block = 13762869 per deployments/pushDonut-v2.json; setting
-- last_block_processed = deploy_block - 1 so the cron starts from the
-- contract's first block without re-scanning the v1 history.

insert into public.indexer_state (contract_address, contract_name, last_block_processed) values
    (lower('0xd0105BC643EadFc8312211e0e4B35c36CEbec7e2'), 'ChainCircleCoreV2',  13762868),
    (lower('0xF75fEc00ea81b31893E3C3C195A46bC2D4BeAcEB'), 'ReputationManagerV2', 13762868),
    (lower('0x8044ce1AE0e40C28b1b4869110a01842f5155523'), 'BadgeNFTV2',          13762868),
    (lower('0xd74eFA9343028bbbc864aE42aac8b11373C9b813'), 'WalletPreferencesV2', 13762868),
    (lower('0x8dAac1b0dbC0B5561768658b2d99be3129318dD2'), 'GovernanceModuleV2',  13762868),
    (lower('0x8Bf15ce481eA106beC3540C44D5A154caBcd03C1'), 'TestnetYield',        13762868)
on conflict (contract_address) do update set
    contract_name = excluded.contract_name,
    last_block_processed = excluded.last_block_processed;

-- ---------- Refresh activity_log materialized view to include v2 events ----------
-- Drop and recreate so the SELECT picks up new tables. This is fine for a
-- testnet project — <1ms rebuild; for mainnet we'd use an incremental refresh.

drop materialized view if exists public.activity_log;

create materialized view public.activity_log as
    select 'contribution'::text as kind,
           c.user_address as actor_address, c.circle_id, c.amount,
           c.tx_hash, c.block_number, c.block_timestamp as ts
    from public.contributions c
    union all
    select 'payout'::text, p.recipient_address, p.circle_id, p.amount,
           p.tx_hash, p.block_number, p.block_timestamp
    from public.payouts p
    union all
    select 'payout_accrued'::text, pa.recipient_address, pa.circle_id,
           (pa.principal + pa.interest), pa.tx_hash, pa.block_number, pa.block_timestamp
    from public.payouts_accrued pa
    where not pa.withdrawn
    union all
    select 'reputation'::text, re.user_address, re.circle_id, re.delta::numeric,
           re.tx_hash, re.block_number, re.block_timestamp
    from public.reputation_events re
    union all
    select 'badge'::text, b.user_address, null::bigint, b.token_id::numeric,
           b.tx_hash, b.block_number, b.minted_at
    from public.badges b
    union all
    select 'tier_change'::text, tc.user_address, null::bigint, tc.score_after::numeric,
           tc.tx_hash, tc.block_number, tc.block_timestamp
    from public.tier_changes tc
    union all
    select ('circle_' || ce.event_type)::text, null::text, ce.circle_id, null::numeric,
           ce.tx_hash, ce.block_number, ce.block_timestamp
    from public.circle_events ce
    union all
    select 'governance'::text, gp.proposer_address, gp.circle_id, null::numeric,
           null::text, gp.created_block, gp.created_at
    from public.governance_proposals gp;

create index activity_log_ts_idx     on public.activity_log (ts desc);
create index activity_log_actor_idx  on public.activity_log (actor_address, ts desc);
create index activity_log_circle_idx on public.activity_log (circle_id, ts desc);

grant select on public.activity_log to anon, authenticated;

commit;
