-- AI insights cache — Phase 8
--
-- Every AI response is cached keyed by (address_or_context, kind). TTL
-- varies by kind (reputation tips are invalidated on activity; circle
-- recommendations longer-lived; weekly summaries live 6 days). The Edge
-- Function checks cache before calling Anthropic, so each paying call
-- is used by many renders.
--
-- Writes go through the service-role Edge Function. Public read is fine
-- for recommendations/summaries; reputation insights are keyed by address
-- so only your own address returns anything meaningful.

begin;

create table public.ai_insights_cache (
    key          text primary key,
    kind         text not null check (kind in ('reputation', 'recommendations', 'summary', 'chat')),
    subject      text,                -- the user address (lowercase) or other scope
    payload      jsonb not null,
    model        text,
    prompt_hash  text,
    expires_at   timestamptz not null,
    created_at   timestamptz not null default now()
);

create index ai_insights_cache_kind_idx    on public.ai_insights_cache (kind);
create index ai_insights_cache_subject_idx on public.ai_insights_cache (subject);
create index ai_insights_cache_expires_idx on public.ai_insights_cache (expires_at);

alter table public.ai_insights_cache enable row level security;

create policy "public read ai_insights"
    on public.ai_insights_cache for select using (true);

-- Writes locked to service role (bypasses RLS automatically).

commit;
