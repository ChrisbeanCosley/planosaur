-- Task priority, and an optional reminder email for high-priority tasks.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- reminder_at:      when to email the reminder (on the task's day), or null for none.
-- reminder_sent_at: set by the send-task-reminders function once the email has gone out.

alter table public.tasks
  add column priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  add column reminder_at timestamptz,
  add column reminder_sent_at timestamptz;

-- The reminder function looks for due, unsent reminders every few minutes.
create index tasks_reminders_due_idx on public.tasks (reminder_at)
  where reminder_at is not null and reminder_sent_at is null;
