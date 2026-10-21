import { Check, Flag } from 'lucide-react';
import { TASK_CATEGORIES } from '../data/categories';
import { formatTaskTime } from '../utils/tasks';
import './TaskCard.css';

// state: 'open' | 'done' | 'overdue'. Clicking the card (not the tick) calls onOpen to edit it.
// compact: smaller version for narrow columns (e.g. the week view).
// showBolt: a ⚡ in the top-right corner of high-priority tasks (used on the dashboard).
export default function TaskCard({ task, state = 'open', onToggle, onOpen, compact = false, showBolt = false }) {
  const category = TASK_CATEGORIES[task.category] ?? TASK_CATEGORIES.other;
  const accent = state === 'overdue' ? 'var(--danger)' : state === 'done' ? 'var(--green)' : category.color;
  const soft = state === 'overdue' ? '#ffc4cb' : state === 'done' ? 'var(--green)' : category.soft;
  const Body = onOpen ? 'button' : 'div';

  return (
    <article
      className={`task-card task-card--${state}${onOpen ? ' task-card--clickable' : ''}${compact ? ' task-card--compact' : ''}`}
      style={{ '--accent': accent, '--accent-soft': soft }}
      onClick={onOpen && (() => onOpen(task))}
    >
      <span className="task-card__bar" />
      {showBolt && task.priority === 'high' && (
        <span className="task-card__bolt" role="img" aria-label="High priority" title="High priority">
          ⚡
        </span>
      )}
      <button
        type="button"
        className="task-card__check"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(task.id);
        }}
        aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      >
        <Check size={19} strokeWidth={2} />
      </button>
      <Body className="task-card__body" {...(onOpen ? { type: 'button', title: 'Edit task' } : {})}>
        <h3 className="task-card__title">
          {task.title}
          {task.priority === 'high' && (
            <span className="task-card__priority task-card__priority--high" title="High priority">
              <Flag size={9} strokeWidth={2.4} /> High
            </span>
          )}
          {task.priority === 'low' && <span className="task-card__priority task-card__priority--low">Low</span>}
        </h3>
        {task.description && <p className="task-card__description">{task.description}</p>}
        <div className="task-card__time">{formatTaskTime(task)}</div>
      </Body>
    </article>
  );
}
