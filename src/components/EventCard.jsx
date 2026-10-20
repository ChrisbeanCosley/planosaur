import { SquareCheckBig, User } from 'lucide-react';
import { EVENT_CATEGORIES } from '../data/categories';
import { formatTaskTime } from '../utils/tasks';
import './EventCard.css';

// Renders a calendar event, or a task when event.kind === 'task'. Clickable when onClick is given.
export default function EventCard({ event, onClick }) {
  const category = EVENT_CATEGORIES[event.category] ?? EVENT_CATEGORIES.work;
  const isTask = event.kind === 'task';
  const time = isTask ? formatTaskTime(event) : event.start && `${event.start} - ${event.end}`;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick, title: `Edit ${isTask ? 'task' : 'event'}` } : {})}
      className={`event-card${isTask ? ' event-card--task' : ''}${event.done ? ' event-card--done' : ''}${onClick ? ' event-card--clickable' : ''}`}
      style={{ background: category.color }}
    >
      <div className="event-card__title">
        {isTask && <SquareCheckBig size={16} strokeWidth={2} className="event-card__task-icon" aria-label="Task" />}
        {event.title}
      </div>
      {time && <div>{time}</div>}
      {event.person && (
        <div className="event-card__person">
          <User size={18} strokeWidth={1.6} />
          {event.person}
        </div>
      )}
    </Tag>
  );
}
