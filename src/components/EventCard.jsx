import { User } from 'lucide-react';
import { EVENT_CATEGORIES } from '../data/categories';
import './EventCard.css';

export default function EventCard({ event }) {
  const category = EVENT_CATEGORIES[event.category] ?? EVENT_CATEGORIES.work;
  return (
    <div className="event-card" style={{ background: category.color }}>
      <div className="event-card__title">{event.title}</div>
      {event.start && (
        <div>
          {event.start} - {event.end}
        </div>
      )}
      {event.person && (
        <div className="event-card__person">
          <User size={18} strokeWidth={1.6} />
          {event.person}
        </div>
      )}
    </div>
  );
}
