# Task reminder emails

High-priority tasks can have a reminder email on the day. The app saves the reminder time on the
task; a Supabase Edge Function checks every 5 minutes for reminders that are due and emails them
through [Resend](https://resend.com).

```
Planosaur app ──saves reminder_at──▶ tasks table
                                         ▲
pg_cron (every 5 min) ──▶ send-task-reminders function ──▶ Resend ──▶ your inbox
```

Until the steps below are done, reminders are saved but no emails are sent.

## 1. Database

Run `supabase/migrations/0009_task_priority.sql` in the Supabase SQL Editor (if you haven't already).

## 2. Resend

1. Create a free account at resend.com.
2. **API Keys → Create API key** (sending access is enough). Copy it.

On the free plan without a verified domain, Resend only delivers to the email address you signed up
to Resend with, sending from `onboarding@resend.dev`. That's fine for testing. To email other users,
add and verify your domain in Resend (**Domains**), then set `REMINDER_FROM_EMAIL` below.

## 3. Deploy the function

In the Supabase dashboard:

1. **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `send-task-reminders`.
3. Replace the example code with the contents of `supabase/functions/send-task-reminders/index.ts`, then **Deploy**.
4. Open the function's **Details / Settings** and turn **off** "Verify JWT" (the schedule
   authenticates with its own secret instead), then save.

(With the Supabase CLI instead: `supabase functions deploy send-task-reminders --no-verify-jwt`.)

## 4. Function secrets

**Edge Functions → Secrets → Add new secret**:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | the key from step 2 |
| `REMINDERS_CRON_SECRET` | any long random string, e.g. the output of `node -e "console.log(crypto.randomUUID())"` |
| `REMINDER_FROM_EMAIL` | optional: `Planosaur <reminders@yourdomain.com>` once your domain is verified |
| `APP_URL` | optional: where Planosaur runs, e.g. `https://planosaur.example.com` |

## 5. Schedule it

1. Open `supabase/reminders/schedule-task-reminders.sql`.
2. Replace `YOUR_PROJECT_REF` (the part of your project URL before `.supabase.co`) and
   `YOUR_CRON_SECRET` (the same value as `REMINDERS_CRON_SECRET`).
3. Run it in the SQL Editor. Don't commit the edited copy: it contains your secret.

## 6. Test

Create a task, set **Priority → High**, tick **Email me a reminder on the day**, and choose a time a
couple of minutes from now. Within about 5 minutes the email should arrive.

If it doesn't:

- **Edge Functions → send-task-reminders → Logs** shows each run's result (`sent`, `failures`).
- In the SQL Editor, `select * from cron.job_run_details order by start_time desc limit 10;` shows
  whether the schedule is running.
- A `401` in the logs means the secret in the schedule doesn't match `REMINDERS_CRON_SECRET`.
