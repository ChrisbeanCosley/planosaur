// Supabase Edge Function: emails reminders for high-priority tasks.
// Runs every few minutes (see supabase/reminders/schedule-task-reminders.sql). Each run finds tasks
// whose reminder time has passed, that aren't done and haven't been reminded yet, and emails the
// task's owner through Resend. Setup steps: docs/task-reminders.md.
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY         required, from resend.com -> API Keys
//   REMINDERS_CRON_SECRET  required, any long random string; the schedule sends it in a header
//   REMINDER_FROM_EMAIL    optional, e.g. "Planosaur <reminders@yourdomain.com>" (needs a domain
//                          verified in Resend; defaults to Resend's test sender)
//   APP_URL                optional, your app's address, linked from the email
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const CRON_SECRET = Deno.env.get('REMINDERS_CRON_SECRET');
const FROM = Deno.env.get('REMINDER_FROM_EMAIL') ?? 'Planosaur <onboarding@resend.dev>';
const APP_URL = Deno.env.get('APP_URL') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reminder_at: string;
};

function taskTime(task: Task) {
  const hm = (t: string | null) => (t ? t.slice(0, 5) : '');
  if (task.start_time && task.end_time) return `${hm(task.start_time)} – ${hm(task.end_time)}`;
  if (task.end_time) return `Due by ${hm(task.end_time)}`;
  return '';
}

function reminderEmail(task: Task, firstName: string) {
  const time = taskTime(task);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const text = [
    greeting,
    '',
    `A reminder about your high-priority task for today:`,
    '',
    task.title,
    time,
    task.description,
    '',
    APP_URL ? `Open Planosaur: ${APP_URL}/tasks` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#4a4a4a">
    <div style="height:6px;background:#8e4498;border-radius:3px 3px 0 0"></div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
      <p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px">A reminder about your <strong style="color:#e87878">high-priority</strong> task for today:</p>
      <div style="padding:14px 16px;border-left:3px solid #e87878;background:#ffdce0;border-radius:6px">
        <div style="font-size:16px;font-weight:bold">${escapeHtml(task.title)}</div>
        ${time ? `<div style="margin-top:4px;color:#8a5a5a">${escapeHtml(time)}</div>` : ''}
        ${task.description ? `<div style="margin-top:6px">${escapeHtml(task.description)}</div>` : ''}
      </div>
      ${
        APP_URL
          ? `<p style="margin:20px 0 0"><a href="${escapeHtml(APP_URL)}/tasks" style="display:inline-block;padding:10px 18px;background:#8e4498;color:#fff;border-radius:8px;text-decoration:none">Open your tasks</a></p>`
          : ''
      }
      <p style="margin:20px 0 0;font-size:12px;color:#a3a3a3">Sent by Planosaur because you asked for a reminder on this task.</p>
    </div>
  </div>`;

  return { subject: `Reminder: ${task.title} (high priority)`, text, html };
}

Deno.serve(async (req) => {
  // Only the scheduled job (which knows the secret) may trigger sends.
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY is not set' }, 500);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from('tasks')
    .select('id, user_id, title, description, date, start_time, end_time, reminder_at')
    .eq('priority', 'high')
    .eq('done', false)
    .not('reminder_at', 'is', null)
    .is('reminder_sent_at', null)
    .lte('reminder_at', now)
    .limit(100);
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  const failures: { taskId: string; reason: string }[] = [];

  for (const task of (due ?? []) as Task[]) {
    // Claim the reminder first, so overlapping runs can't send it twice.
    const { data: claimed } = await supabase
      .from('tasks')
      .update({ reminder_sent_at: now })
      .eq('id', task.id)
      .is('reminder_sent_at', null)
      .select('id');
    if (!claimed?.length) continue;

    const release = () => supabase.from('tasks').update({ reminder_sent_at: null }).eq('id', task.id);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(task.user_id);
    const email = userData?.user?.email;
    if (userError || !email) {
      failures.push({ taskId: task.id, reason: userError?.message ?? 'User has no email' });
      await release();
      continue;
    }

    const { subject, text, html } = reminderEmail(task, userData.user.user_metadata?.first_name ?? '');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject, text, html }),
    });
    if (!res.ok) {
      failures.push({ taskId: task.id, reason: `Resend ${res.status}: ${await res.text()}` });
      await release(); // try again on the next run
      continue;
    }
    sent += 1;
  }

  return json({ checked: due?.length ?? 0, sent, failures });
});
