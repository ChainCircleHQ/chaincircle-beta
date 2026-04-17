# ChainCircle Supabase

Indexed state from Push Chain testnet — circles, members, contributions, payouts, reputation events, badges, governance. Writes come from the Edge Function indexer; the frontend reads with the anon key.

## Project

- **Project ref:** `altzfewmmtnfzrnonqkz`
- **URL:** `https://altzfewmmtnfzrnonqkz.supabase.co`
- Region and DB password: ask the project owner.

## Layout

```
supabase/
├── config.toml                        # local CLI config
├── migrations/
│   ├── 20260417000000_init_schema.sql          # tables + indexes + seed indexer_state
│   ├── 20260417000001_rls_policies.sql         # public read, service-role write
│   └── 20260417000002_activity_refresh_and_cron.sql  # refresh helper + cron template
└── functions/
    ├── _shared/
    │   ├── supabase.ts                # admin client
    │   └── chain.ts                   # ethers provider + event ABIs
    ├── index-events/index.ts          # incremental indexer (runs every minute)
    └── backfill/index.ts              # one-shot from block 0
```

## One-time setup

1. **Generate a Supabase access token** at https://app.supabase.com/account/tokens and run:
   ```bash
   supabase login --token <your-access-token>
   supabase link --project-ref altzfewmmtnfzrnonqkz
   ```

2. **Apply migrations:**
   ```bash
   supabase db push
   ```
   (You'll be prompted for the database password the first time.)

   *Alternative (no CLI):* open the Supabase dashboard → SQL Editor and paste each file in `supabase/migrations/` in numeric order.

3. **Set function secrets:**
   ```bash
   supabase secrets set \
       SUPABASE_URL=https://altzfewmmtnfzrnonqkz.supabase.co \
       SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
       PUSH_CHAIN_RPC=https://evm.rpc-testnet-donut-node1.push.org/ \
       INDEXER_FUNCTION_URL=https://altzfewmmtnfzrnonqkz.supabase.co/functions/v1/index-events
   ```

4. **Deploy functions:**
   ```bash
   supabase functions deploy index-events
   supabase functions deploy backfill
   ```

5. **Backfill once:**
   ```bash
   curl -X POST https://altzfewmmtnfzrnonqkz.supabase.co/functions/v1/backfill \
       -H "Authorization: Bearer <service-role-key>"
   ```

6. **Enable cron** — in SQL Editor, enable `pg_cron` + `pg_net` under Database → Extensions, then run the `cron.schedule(...)` example at the bottom of `20260417000002_activity_refresh_and_cron.sql`, substituting your service-role key into a postgres setting:
   ```sql
   alter database postgres set app.service_role_key = '<service-role-key>';
   ```

## Running locally

```bash
supabase start              # spins up local Postgres + Studio on :54323
supabase db reset           # applies migrations to local db
supabase functions serve    # serves functions on :54321/functions/v1/*
```

Frontend points at local via `VITE_SUPABASE_URL=http://localhost:54321` in `frontend/.env.local`.

## Schema cheat-sheet

| Table | PK | Written by | Read by |
|---|---|---|---|
| `users` | `address` | indexer | frontend |
| `circles` | `id`, uniq `circle_id` | indexer | frontend |
| `circle_members` | `id`, uniq `(circle_id, user_address)` | indexer | frontend |
| `contributions` | `tx_hash` | indexer | frontend |
| `payouts` | `tx_hash` | indexer | frontend |
| `reputation_events` | `id`, uniq `(tx_hash, log_index)` | indexer | frontend |
| `badges` | `token_id` | indexer | frontend |
| `governance_votes` | `id`, uniq `proposal_id` | indexer | frontend |
| `activity_log` | (matview over the above) | refresh on tick | frontend |
| `indexer_state` | `contract_address` | indexer | service role only |

## Which contract emits what

See `supabase/functions/_shared/chain.ts#EVENT_ABIS` for the narrow subset the indexer decodes. When contracts change, update both that file AND `frontend/src/abis/*.json`.
