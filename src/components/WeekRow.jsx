import { useState } from 'react';
import EventCard from './EventCard';
import { addDays, DAY_LABELS, todayKey, toKey } from '../utils/date';
import './WeekRow.css';

const byStart = (a, b) => (a.start ?? '').localeCompare(b.start ?? '');

export default function WeekRow({ weekStart, events, maxPerDay = 2 }) {
  const [expanded, setExpanded] = useState({});
  const today = todayKey();

  return (
    <div className="week-row">
      {DAY_LABELS.map((label, i) => {
        const date = addDays(weekStart, i);
        const key = toKey(date);
        const dayEvents = events.filter((e) => e.date === key).sort(byStart);
        const showAll = expanded[key];
        const visible = showAll ? dayEvents : dayEvents.slice(0, maxPerDay);
        const hidden = dayEvents.length - visible.length;
        const toggle = () => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

        return (
          <div key={key} className={`week-day${key === today ? ' week-day--today' : ''}`}>
            <div className="week-day__label">{label}</div>
            <div className="week-day__number">{date.getDate()}</div>
            <div className="week-day__events">
              {visible.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {hidden > 0 && (
                <button type="button" className="link-button week-day__more" onClick={toggle}>
                  And {hidden} more
                </button>
              )}
              {showAll && dayEvents.length > maxPerDay && (
                <button type="button" className="link-button week-day__more" onClick={toggle}>
                  Show less
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
