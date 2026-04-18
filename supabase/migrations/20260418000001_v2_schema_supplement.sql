-- Supplemental v2 schema fixes uncovered by wiring up the indexer:
--   1. circle_events.event_type needs 'emergency' to log EmergencyWithdrawal
--   2. indexer needs to key per-user governance vote history (for "has voted"
--      checks in UI without a round-trip to contract)
--   3. linked_wallets table so the frontend can read wallet preferences from
--      Supabase instead of on every page load calling getLinkedWallets RPC.

begin;

-- 1. expand circle_events constraint to cover emergency withdrawals
alter table public.circle_events drop constraint if exists circle_events_event_type_check;
alter table public.circle_events
    add constraint circle_events_event_type_check
    check (event_type in ('started','paused','unpaused','cancelled','completed','emergency'));

-- 2. per-voter governance votes
create table if not exists public.proposal_votes (
    proposal_id   bigint not null references public.governance_proposals(proposal_id) on delete cascade,
    voter_address text not null references public.users(address),
    support       boolean not null,
    weight        smallint not null,
    tx_hash       text not null,
    block_number  bigint not null,
    voted_at      timestamptz not null default now(),
    primary key (proposal_id, voter_address)
);
create index if not exists proposal_votes_voter_idx on public.proposal_votes (voter_address);
alter table public.proposal_votes enable row level security;
create policy "public read proposal_votes" on public.proposal_votes for select using (true);

-- 3. linked_wallets mirror
create table if not exists public.linked_wallets (
    user_address   text not null references public.users(address),
    wallet_address text not null,
    chain_id       bigint not null,
    chain_name     text not null default '',
    is_preferred   boolean not null default false,
    added_at       timestamptz not null,
    removed        boolean not null default false,
    updated_at     timestamptz not null default now(),
    primary key (user_address, wallet_address)
);
create index if not exists linked_wallets_user_idx on public.linked_wallets (user_address)
    where removed = false;
alter table public.linked_wallets enable row level security;
create policy "public read linked_wallets" on public.linked_wallets for select using (true);

create trigger linked_wallets_updated_at
    before update on public.linked_wallets
    for each row execute function public.set_updated_at();

commit;
