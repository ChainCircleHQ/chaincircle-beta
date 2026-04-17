-- ChainCircle RLS — Phase 4
-- Public read for everything (the data mirrors on-chain state, which is already public).
-- Writes are restricted to the service role (used by the indexer Edge Function).
-- The anon key can only read; it can never mutate.

begin;

alter table public.users              enable row level security;
alter table public.circles            enable row level security;
alter table public.circle_members     enable row level security;
alter table public.contributions      enable row level security;
alter table public.payouts            enable row level security;
alter table public.reputation_events  enable row level security;
alter table public.badges             enable row level security;
alter table public.governance_votes   enable row level security;
alter table public.indexer_state      enable row level security;

-- Public read on all indexed on-chain state
create policy "public read users"             on public.users             for select using (true);
create policy "public read circles"           on public.circles           for select using (true);
create policy "public read circle_members"    on public.circle_members    for select using (true);
create policy "public read contributions"     on public.contributions     for select using (true);
create policy "public read payouts"           on public.payouts           for select using (true);
create policy "public read reputation_events" on public.reputation_events for select using (true);
create policy "public read badges"            on public.badges            for select using (true);
create policy "public read governance_votes"  on public.governance_votes  for select using (true);

-- indexer_state is NOT public — only service role reads/writes. No public policy = no access.

-- activity_log is a materialized view, inherits no RLS by default, but PostgREST
-- exposes it as a read-only selectable relation under the anon role via the API.
-- Grant explicitly so the anon role can read it.
grant select on public.activity_log to anon, authenticated;

-- Writes: no public write policies. Service role bypasses RLS automatically.

commit;
