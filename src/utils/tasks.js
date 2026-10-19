import { timeToMinutes, todayKey } from './date';

// A task is overdue once its end time has passed and it still isn't done.
export function taskState(task, now = new Date()) {
  if (task.done) return 'done';
  const today = todayKey();
  if (task.date < today) return 'overdue';
  if (task.date === today && task.end) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (timeToMinutes(task.end) < nowMinutes) return 'overdue';
  }
  return 'open';
}

export const formatTaskTime = (task) =>
  task.start ? `${task.start} - ${task.end}` : task.end ? `Until ${task.end}` : '';

export const byStartTime = (a, b) => (a.start || a.end || '').localeCompare(b.start || b.end || '');
