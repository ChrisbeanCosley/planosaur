-- Runs the send-task-reminders Edge Function every 5 minutes.
-- NOT a numbered migration: edit the two placeholders below first, then run it once in the
-- Supabase SQL Editor. Full steps: docs/task-reminders.md.
--
--   YOUR_PROJECT_REF        the part before .supabase.co in your project URL
--   YOUR_CRON_SECRET        the same value you saved as the REMINDERS_CRON_SECRET function secret

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the function address and secret in Supabase Vault rather than in the job text.
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-task-reminders', 'task_reminders_url');
select vault.create_secret('YOUR_CRON_SECRET', 'task_reminders_cron_secret');

select cron.schedule(
  'send-task-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'task_reminders_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'task_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To stop the reminders later:  select cron.unschedule('send-task-reminders');
-- To see recent runs:           select * from cron.job_run_details order by start_time desc limit 10;
