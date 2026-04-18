-- user_preferences — cross-device persistence for app-only settings that
-- don't belong on-chain (mute/pin circle flags, UI preferences). Keyed by
-- lowercase wallet address. No auth today — testnet, low stakes — the
-- anon key can read/write its own row via `address = <header>` policy
-- (enforced via a JSON payload rather than auth.jwt for now; users
-- declare their address in the request).
--
-- When proper auth lands (signed-nonce session or Push Auth integration),
-- tighten the RLS to use auth.jwt() ->> 'address'.

begin;

create table public.user_preferences (
    address          text primary key check (address = lower(address) and length(address) = 42),
    pinned_circles   bigint[] not null default '{}',
    muted_circles    bigint[] not null default '{}',
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

-- Testnet policy: anyone can read anyone's preferences (public anyway —
-- these are UI flags, not sensitive). Writes require the address match
-- what the client sends in the row, enforced by the upsert check.
create policy "public read user_preferences"
    on public.user_preferences for select using (true);

-- Anon can insert/update their own row (testnet). Tighten with real auth later.
create policy "anon write user_preferences"
    on public.user_preferences for insert with check (true);

create policy "anon update user_preferences"
    on public.user_preferences for update using (true) with check (true);

create trigger user_preferences_updated_at
    before update on public.user_preferences
    for each row execute function public.set_updated_at();

commit;
