-- Purge v1 circle rows to eliminate circle_id collisions with v2.
--
-- Background: `circles.circle_id` is the primary key. Both v1
-- (ChainCircleCore at 0x59D4…) and v2 (ChainCircleCoreV2 at 0xd010…)
-- emit CircleCreated(id=1), (id=2), (id=3)… because each core has its
-- own independent counter. The v1 indexer wrote rows at id=1..N; the
-- v2 indexer's upsert on the same id overwrites some fields but
-- inherits others (e.g. total_pooled stayed as the v1 estimate, and
-- circle_members kept v1 rows — so a freshly-created v2 circle id=3
-- showed 2/9 members and $100 pool because a v1 circle id=3 preexisted).
--
-- The v1 core is abandoned — no one can interact with it anymore (the
-- frontend only writes to v2, the indexer still indexes it only for
-- historical stats but those stats are now wrong). Cleanest fix: drop
-- every v1 row. Cascading FKs clean circle_members, contributions,
-- payouts, payouts_accrued, circle_events. We only keep v2 circles.
--
-- reputation_events / tier_changes / badges don't reference circles by
-- FK (only via plain columns), so those rows stay — historical rep is
-- still accurate from the user's POV.
--
-- Also reset the v1 indexer_state so the cron stops scanning the old
-- core address for events we no longer care about.

begin;

-- 1. Delete v1 circles; cascade handles dependent rows.
delete from public.circles where core_version is null or core_version = 1;

-- 2. Stop the indexer cron from re-scanning v1 contract addresses. We
--    keep the rows so a future operator can reactivate them, but park
--    last_block_processed at head to effectively pause.
update public.indexer_state
   set last_block_processed = 2147483647,
       last_error = 'paused: v1 contracts abandoned post-v2 redeploy'
 where contract_name in (
    'ChainCircleCore', 'ReputationManager', 'BadgeNFT',
    'WalletPreferences', 'GovernanceModule', 'NameRegistry'
 );

-- 3. Refresh the activity log so v1 rows drop out.
refresh materialized view public.activity_log;

commit;
