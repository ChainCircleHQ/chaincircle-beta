-- Phase 4.1: relax schema for fields the actual deployed contract events
-- don't carry. The CircleCreated event only emits (id, creator, goalAmount);
-- the rest (name, goalType, duration, cap, frequency) come from a
-- circles(id) state read at index time. Position and round also aren't in
-- events — leave them nullable; we'll compute/enrich later if needed.

begin;

-- circles
alter table public.circles alter column name                 drop not null;
alter table public.circles alter column goal_type            drop not null;
alter table public.circles alter column contribution_amount  drop not null;
alter table public.circles alter column duration_months      drop not null;
alter table public.circles alter column member_cap           drop not null;
alter table public.circles alter column frequency            drop not null;

alter table public.circles drop constraint if exists circles_goal_type_check;
alter table public.circles drop constraint if exists circles_duration_months_check;
alter table public.circles drop constraint if exists circles_member_cap_check;
alter table public.circles drop constraint if exists circles_frequency_check;

-- circle_members: position is not in the event; drop NOT NULL + the unique (circle, position)
alter table public.circle_members alter column position drop not null;
alter table public.circle_members drop constraint if exists circle_members_circle_id_position_key;

-- contributions / payouts: round not in events
alter table public.contributions alter column round drop not null;
alter table public.payouts       alter column round drop not null;

-- reputation_events: event_type required but deployed ReputationManager emits
-- ScoreChanged with just (user, oldScore, newScore, reason). Use reason as
-- event_type for now. delta = newScore - oldScore is computed in the indexer.
-- Keep NOT NULL — the indexer will always provide something.

commit;
