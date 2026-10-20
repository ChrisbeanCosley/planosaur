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

// Matches the category check in supabase/migrations/0003_expenses.sql.
export const EXPENSE_CATEGORIES = {
  software: { label: 'Software', color: '#8a7bea' },
  equipment: { label: 'Equipment', color: '#c553cf' },
  office: { label: 'Office', color: '#df5f9c' },
  travel: { label: 'Travel', color: '#f5a623' },
  meals: { label: 'Meals', color: '#e87878' },
  marketing: { label: 'Marketing', color: '#4fb6c9' },
  utilities: { label: 'Utilities', color: '#6cc644' },
  other: { label: 'Other', color: '#a3a3a3' },
};

export const toOptions = (categories) =>
  Object.entries(categories).map(([value, { label, color }]) => ({ value, label, color }));
