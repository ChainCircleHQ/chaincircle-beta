// Supabase-backed notifications. Prior version event-scanned v1 contracts
// directly; it hard-coded getUserCircles(address) + PayoutProcessed /
// InterestDistributed which don't exist in v2, so every call CALL_EXCEPTION'd
// after the redeploy.
//
// Now we pull from the normalized indexed tables (activity_log rolls up
// contributions, payouts, reputation, badges, tier_changes, circle events)
// and compute per-round contribution reminders from circle_members +
// circles.current_round + circle.frequency.
//
// Shape kept compatible with RemindersBanner.jsx + Routes/Notification.jsx:
//   { transactions: [{ type, id, timestamp, circleId?, amount?, ... }],
//     reminders:    [{ type: 'contributionDue', id, circleId, amount, dueTime, timeUntilDue }] }

import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useCircleContract } from './useCircleContract';
import { supabase } from '../lib/supabase';

const lc = (addr) => (addr ? String(addr).toLowerCase() : addr);
const fmt = (raw) => (raw == null ? '0' : ethers.formatUnits(String(raw), 6));
const unix = (iso) => (iso ? Math.floor(new Date(iso).getTime() / 1000) : 0);

// Frequency enum → seconds between rounds. 0 = monthly (30d), 1 = weekly (7d).
const frequencySeconds = (freq) => (Number(freq) === 1 ? 7 * 86400 : 30 * 86400);

export function useNotifications() {
  const { userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['notifications.db', userAddress],
    queryFn: async () => {
      const addr = lc(userAddress);
      const out = { transactions: [], reminders: [] };

      // ---- Transactions: pulled from the per-table indexer rows so we can
      // render type-specific copy without parsing activity_log.kind strings.
      const [contribsRes, payoutsRes, repRes, tiersRes, badgesRes, membersRes, emergenciesRes] =
        await Promise.all([
          supabase.from('contributions').select('tx_hash, circle_id, amount, block_timestamp')
            .eq('user_address', addr).order('block_timestamp', { ascending: false }).limit(50),
          supabase.from('payouts').select('tx_hash, circle_id, amount, block_timestamp')
            .eq('recipient_address', addr).order('block_timestamp', { ascending: false }).limit(50),
          supabase.from('reputation_events').select('tx_hash, log_index, delta, score_after, reason, block_timestamp')
            .eq('user_address', addr).order('block_timestamp', { ascending: false }).limit(50),
          supabase.from('tier_changes').select('tx_hash, from_tier, to_tier, block_timestamp')
            .eq('user_address', addr).order('block_timestamp', { ascending: false }).limit(20),
          supabase.from('badges').select('tx_hash, token_id, badge_type, minted_at')
            .eq('user_address', addr).order('minted_at', { ascending: false }).limit(20),
          supabase.from('circle_members').select('circle_id, joined_block, joined_at')
            .eq('user_address', addr).order('joined_at', { ascending: false }).limit(50),
          supabase.from('circle_events').select('tx_hash, circle_id, event_type, reason, block_timestamp')
            .eq('event_type', 'emergency').order('block_timestamp', { ascending: false }).limit(100),
        ]);

      for (const c of contribsRes.data ?? []) {
        out.transactions.push({
          id: `contribution-${c.tx_hash}`,
          type: 'contribution',
          circleId: String(c.circle_id),
          amount: fmt(c.amount),
          timestamp: unix(c.block_timestamp),
          txHash: c.tx_hash,
        });
      }
      for (const p of payoutsRes.data ?? []) {
        out.transactions.push({
          id: `payout-${p.tx_hash}`,
          type: 'payout',
          circleId: String(p.circle_id),
          amount: fmt(p.amount),
          timestamp: unix(p.block_timestamp),
          txHash: p.tx_hash,
        });
      }
      for (const r of repRes.data ?? []) {
        out.transactions.push({
          id: `rep-${r.tx_hash}-${r.log_index}`,
          type: 'scoreChange',
          reason: r.reason || 'score update',
          newScore: Number(r.score_after) || 0,
          timestamp: unix(r.block_timestamp),
          txHash: r.tx_hash,
        });
      }
      for (const t of tiersRes.data ?? []) {
        out.transactions.push({
          id: `tier-${t.tx_hash}-${t.to_tier}`,
          type: 'tierChange',
          newTier: t.to_tier,
          fromTier: t.from_tier || null,
          timestamp: unix(t.block_timestamp),
          txHash: t.tx_hash,
        });
      }
      for (const b of badgesRes.data ?? []) {
        out.transactions.push({
          id: `badge-${b.tx_hash}-${b.token_id}`,
          type: 'badgeMinted',
          badgeType: b.badge_type,
          timestamp: unix(b.minted_at),
          txHash: b.tx_hash,
        });
      }
      for (const m of membersRes.data ?? []) {
        out.transactions.push({
          id: `joined-${m.circle_id}-${m.joined_block}`,
          type: 'joined',
          circleId: String(m.circle_id),
          timestamp: unix(m.joined_at),
        });
      }
      // Emergency withdrawal rows live in circle_events with reason like
      // "refund=X;penalty=Y;member=0x…" — surface only the user's own exits.
      for (const e of emergenciesRes.data ?? []) {
        if (!e.reason?.toLowerCase().includes(addr)) continue;
        const refund = /refund=(\d+)/.exec(e.reason)?.[1];
        out.transactions.push({
          id: `emergency-${e.tx_hash}`,
          type: 'emergency',
          circleId: String(e.circle_id),
          amount: refund ? fmt(refund) : '0',
          timestamp: unix(e.block_timestamp),
          txHash: e.tx_hash,
        });
      }

      out.transactions.sort((a, b) => b.timestamp - a.timestamp);

      // ---- Reminders: v2 active circles where the user hasn't paid this round.
      // Compute next-due = started_at + (currentRound + 1) * freqSeconds.
      const myCircleIds = (membersRes.data ?? []).map((m) => m.circle_id);
      if (myCircleIds.length) {
        const { data: circles } = await supabase
          .from('circles_with_counts')
          .select('circle_id, contribution_amount, frequency, current_round, duration_months, status, started_ts')
          .in('circle_id', myCircleIds)
          .eq('status', 1)
          .eq('core_version', 2);
        const myMemberships = new Map(
          (membersRes.data ?? []).map((m) => [m.circle_id, m]),
        );
        const nowSec = Math.floor(Date.now() / 1000);
        for (const c of circles ?? []) {
          const membership = myMemberships.get(c.circle_id);
          if (!membership) continue;
          const freq = frequencySeconds(c.frequency);
          const startTs = Number(c.started_ts) || 0;
          if (!startTs) continue;
          const nextDue = startTs + (Number(c.current_round) + 1) * freq;
          const timeUntilDue = nextDue - nowSec;
          if (timeUntilDue <= 0 || timeUntilDue > 7 * 86400) continue;
          out.reminders.push({
            id: `reminder-${c.circle_id}`,
            type: 'contributionDue',
            circleId: String(c.circle_id),
            amount: fmt(c.contribution_amount),
            dueTime: nextDue,
            timeUntilDue,
          });
        }
      }
      out.reminders.sort((a, b) => a.timeUntilDue - b.timeUntilDue);

      return out;
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
