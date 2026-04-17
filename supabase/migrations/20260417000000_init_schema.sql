-- ChainCircle schema — Phase 4 init
-- Indexed state from Push Chain testnet (pushDonut / chainId 42101).
-- All addresses stored LOWERCASE for cheap joins. Checksum-case is presentation-only.

begin;

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- for circle name search

-- ---------- users ----------
create table public.users (
    address          text primary key check (address = lower(address) and length(address) = 42),
    display_name     text,
    chain_origin     text,  -- 'ethereum' | 'solana' | 'push' — detected via UEA, optional
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index users_display_name_trgm_idx on public.users using gin (display_name gin_trgm_ops);

-- ---------- circles ----------
create table public.circles (
    id                  bigserial primary key,
    circle_id           bigint not null unique,  -- on-chain id from ChainCircleCore
    creator_address     text not null references public.users(address) on delete restrict,
    name                text not null,
    goal_type           smallint not null check (goal_type between 0 and 5),
    contribution_amount numeric(38, 0) not null,  -- base units, CUSD has 6 decimals
    duration_months     smallint not null check (duration_months between 3 and 24),
    member_cap          smallint not null check (member_cap between 3 and 12),
    frequency           smallint not null check (frequency in (0, 1)),  -- 0 monthly, 1 weekly
    status              smallint not null default 0 check (status between 0 and 4),
    current_round       smallint not null default 0,
    total_pooled        numeric(38, 0) not null default 0,
    contract_address    text not null,
    started_at          timestamptz,
    completed_at        timestamptz,
    created_block       bigint not null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index circles_creator_idx  on public.circles (creator_address);
create index circles_status_idx   on public.circles (status);
create index circles_name_trgm    on public.circles using gin (name gin_trgm_ops);

-- ---------- circle_members ----------
create table public.circle_members (
    id             bigserial primary key,
    circle_id      bigint not null references public.circles(circle_id) on delete cascade,
    user_address   text   not null references public.users(address) on delete restrict,
    position       smallint not null,
    joined_block   bigint not null,
    joined_at      timestamptz not null,
    has_contributed_current_round boolean not null default false,
    has_received_payout           boolean not null default false,
    unique (circle_id, user_address),
    unique (circle_id, position)
);

create index circle_members_user_idx on public.circle_members (user_address);

-- ---------- contributions ----------
create table public.contributions (
    tx_hash         text primary key check (length(tx_hash) = 66),
    circle_id       bigint not null references public.circles(circle_id) on delete cascade,
    user_address    text   not null references public.users(address),
    amount          numeric(38, 0) not null,
    round           smallint not null,
    block_number    bigint not null,
    block_timestamp timestamptz not null,
    created_at      timestamptz not null default now()
);

create index contributions_user_idx       on public.contributions (user_address);
create index contributions_circle_idx     on public.contributions (circle_id);
create index contributions_block_idx      on public.contributions (block_number desc);

-- ---------- payouts ----------
create table public.payouts (
    tx_hash           text primary key check (length(tx_hash) = 66),
    circle_id         bigint not null references public.circles(circle_id) on delete cascade,
    recipient_address text   not null references public.users(address),
    amount            numeric(38, 0) not null,
    round             smallint not null,
    block_number      bigint not null,
    block_timestamp   timestamptz not null,
    created_at        timestamptz not null default now()
);

create index payouts_recipient_idx on public.payouts (recipient_address);
create index payouts_circle_idx    on public.payouts (circle_id);
create index payouts_block_idx     on public.payouts (block_number desc);

-- ---------- reputation_events ----------
create table public.reputation_events (
    id               bigserial primary key,
    user_address     text not null references public.users(address),
    event_type       text not null,  -- COMPLETE_CYCLE | ON_TIME_PAYMENT | STREAK_BONUS | GRACE_PENALTY | PAYOUT_RECEIVED | SUBSEQUENT_CYCLE
    delta            integer not null,
    score_after      integer not null,
    reason           text,
    tx_hash          text not null,
    log_index        integer not null,  -- multiple events per tx
    block_number     bigint not null,
    block_timestamp  timestamptz not null,
    created_at       timestamptz not null default now(),
    unique (tx_hash, log_index)
);

create index reputation_events_user_idx  on public.reputation_events (user_address, block_number desc);
create index reputation_events_block_idx on public.reputation_events (block_number desc);

-- ---------- badges ----------
create table public.badges (
    token_id        bigint primary key,
    user_address    text   not null references public.users(address),
    badge_type      text   not null,  -- GOLD | SILVER | BRONZE | STREAK | etc.
    tx_hash         text   not null,
    block_number    bigint not null,
    minted_at       timestamptz not null,
    created_at      timestamptz not null default now()
);

create index badges_user_idx on public.badges (user_address);

-- ---------- governance_votes ----------
create table public.governance_votes (
    id                  bigserial primary key,
    proposal_id         bigint not null unique,   -- on-chain proposal id
    circle_id           bigint references public.circles(circle_id) on delete set null,
    proposal_type       text not null,
    proposer_address    text not null references public.users(address),
    started_at          timestamptz not null,
    ended_at            timestamptz,
    outcome             text not null default 'pending'  -- pending | passed | failed | executed
        check (outcome in ('pending', 'passed', 'failed', 'executed')),
    votes_for           integer not null default 0,
    votes_against       integer not null default 0,
    created_block       bigint not null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ---------- indexer_state ----------
-- Per-contract checkpoint so the Edge Function can resume after crashes
-- and we don't re-scan the whole chain on every run.
create table public.indexer_state (
    contract_address      text primary key check (contract_address = lower(contract_address)),
    contract_name         text not null,
    last_block_processed  bigint not null default 0,
    last_run_at           timestamptz,
    last_error            text,
    error_count           integer not null default 0,
    updated_at            timestamptz not null default now()
);

-- Seed the contracts we'll be indexing. last_block_processed=0 means backfill from genesis.
insert into public.indexer_state (contract_address, contract_name) values
    (lower('0x59D44aea45bd92E2798b7998e8E090586670f161'), 'ChainCircleCore'),
    (lower('0xEaEa469279B89E7fF0BDd5903226483418AB37e4'), 'ReputationManager'),
    (lower('0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50'), 'BadgeNFT'),
    (lower('0xA3c786088a6D3EB9216B5647a4149a7dF0149b49'), 'GovernanceModule'),
    (lower('0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E'), 'NameRegistry');

-- ---------- activity_log (materialized view) ----------
-- Unified activity feed for the Recent Activity UI. Refreshed by the indexer.
create materialized view public.activity_log as
    select
        'contribution'::text as kind,
        c.user_address       as actor_address,
        c.circle_id,
        c.amount,
        c.tx_hash,
        c.block_number,
        c.block_timestamp    as ts
    from public.contributions c
    union all
    select
        'payout'::text,
        p.recipient_address,
        p.circle_id,
        p.amount,
        p.tx_hash,
        p.block_number,
        p.block_timestamp
    from public.payouts p
    union all
    select
        'reputation'::text,
        re.user_address,
        null::bigint,
        re.delta::numeric,
        re.tx_hash,
        re.block_number,
        re.block_timestamp
    from public.reputation_events re
    union all
    select
        'badge'::text,
        b.user_address,
        null::bigint,
        b.token_id::numeric,
        b.tx_hash,
        b.block_number,
        b.minted_at
    from public.badges b;

create index activity_log_ts_idx     on public.activity_log (ts desc);
create index activity_log_actor_idx  on public.activity_log (actor_address, ts desc);
create index activity_log_circle_idx on public.activity_log (circle_id, ts desc);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger users_updated_at             before update on public.users             for each row execute function public.set_updated_at();
create trigger circles_updated_at           before update on public.circles           for each row execute function public.set_updated_at();
create trigger indexer_state_updated_at     before update on public.indexer_state     for each row execute function public.set_updated_at();
create trigger governance_votes_updated_at  before update on public.governance_votes  for each row execute function public.set_updated_at();

commit;
