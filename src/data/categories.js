export const EVENT_CATEGORIES = {
  booking: { label: 'Booking', color: 'var(--pink)' },
  meeting: { label: 'Meeting', color: 'var(--magenta)' },
  work: { label: 'Work', color: 'var(--purple)' },
  personal: { label: 'Personal', color: 'var(--green)' },
};

export const TASK_CATEGORIES = {
  work: { label: 'Work', color: 'var(--purple)', soft: 'var(--purple-soft)' },
  meetings: { label: 'Meetings', color: 'var(--magenta)', soft: 'var(--magenta-soft)' },
  other: { label: 'Other', color: 'var(--green)', soft: 'var(--green-soft)' },
};

export const toOptions = (categories) =>
  Object.entries(categories).map(([value, { label, color }]) => ({ value, label, color }));
