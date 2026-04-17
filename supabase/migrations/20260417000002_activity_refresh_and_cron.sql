-- Activity log refresh helper + cron schedule for the indexer.
-- Requires pg_cron + pg_net extensions (enabled via Supabase dashboard
-- → Database → Extensions, or run this block which enables them in schema extensions).

begin;

create extension if not exists pg_cron   with schema extensions;
create extension if not exists pg_net    with schema extensions;

-- Refresh helper — called by the indexer Edge Function after each run.
create or replace function public.refresh_activity_log()
returns void language sql security definer as $$
    refresh materialized view public.activity_log;
$$;

grant execute on function public.refresh_activity_log() to service_role;

-- Schedule the indexer to run every minute.
-- REPLACE the URL + service-role key AFTER you deploy the function:
--     select cron.unschedule('chaincircle-indexer-every-minute');
--     then re-run this INSERT with the deployed URL + key.
--
-- The function URL is https://<project-ref>.supabase.co/functions/v1/index-events
-- The Authorization header must include the service role key.
--
-- Example (fill in the placeholders):
--
-- select cron.schedule(
--     'chaincircle-indexer-every-minute',
--     '* * * * *',
--     $$
--     select net.http_post(
--         url     := 'https://altzfewmmtnfzrnonqkz.supabase.co/functions/v1/index-events',
--         headers := jsonb_build_object(
--             'Content-Type',  'application/json',
--             'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--         ),
--         body    := '{}'::jsonb
--     );
--     $$
-- );

commit;
