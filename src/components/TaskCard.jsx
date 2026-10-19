import { Check } from 'lucide-react';
import { TASK_CATEGORIES } from '../data/categories';
import { formatTaskTime } from '../utils/tasks';
import './TaskCard.css';

// state: 'open' | 'done' | 'overdue'
export default function TaskCard({ task, state = 'open', onToggle }) {
  const category = TASK_CATEGORIES[task.category] ?? TASK_CATEGORIES.other;
  const accent = state === 'overdue' ? 'var(--danger)' : state === 'done' ? 'var(--green)' : category.color;
  const soft = state === 'overdue' ? '#ffc4cb' : state === 'done' ? 'var(--green)' : category.soft;

  return (
    <article className={`task-card task-card--${state}`} style={{ '--accent': accent, '--accent-soft': soft }}>
      <span className="task-card__bar" />
      <button
        type="button"
        className="task-card__check"
        onClick={() => onToggle?.(task.id)}
        aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      >
        <Check size={28} strokeWidth={2} />
      </button>
      <div className="task-card__body">
        <h3 className="task-card__title">{task.title}</h3>
        {task.description && <p className="task-card__description">{task.description}</p>}
        <div className="task-card__time">{formatTaskTime(task)}</div>
      </div>
    </article>
  );
}
