import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import EventFormModal from '../components/EventFormModal';
import FilterMenu from '../components/FilterMenu';
import SearchToggle from '../components/SearchToggle';
import ItemEditor, { selectionFor } from '../components/ItemEditor';
import WeekRow from '../components/WeekRow';
import { EVENT_CATEGORIES, toOptions } from '../data/categories';
import { addDays, formatMonthYear, startOfWeek } from '../utils/date';
import { calendarItems } from '../utils/tasks';
import './Calendar.css';

const WEEKS_SHOWN = 2;

export default function Calendar() {
  const { events, tasks, addEvent } = useAppData();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selection, setSelection] = useState(null); // task or event being edited

  const q = query.trim().toLowerCase();
  const visibleEvents = calendarItems(events, tasks).filter(
    (e) =>
      (!q || `${e.title} ${e.person ?? ''}`.toLowerCase().includes(q)) &&
      (categories.length === 0 || categories.includes(e.category)),
  );

  const shift = (weeks) => setWeekStart((d) => addDays(d, weeks * 7));

  return (
    <div className="calendar">
      <h1 className="page-title">Calendar</h1>

      <div className="toolbar calendar__toolbar">
        <div className="calendar__nav">
          <h2>{formatMonthYear(weekStart)}</h2>
          <button type="button" className="icon-button" onClick={() => shift(-WEEKS_SHOWN)} aria-label="Previous weeks">
            <ChevronLeft size={28} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            className="calendar__today"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            aria-label="Jump to this week"
            title="Today"
          />
          <button type="button" className="icon-button" onClick={() => shift(WEEKS_SHOWN)} aria-label="Next weeks">
            <ChevronRight size={28} strokeWidth={1.6} />
          </button>
        </div>
        <div className="toolbar__actions">
          <SearchToggle value={query} onChange={setQuery} placeholder="Search events & tasks" />
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            <Plus size={24} strokeWidth={1.8} />
            Add Event
          </button>
          <FilterMenu
            title="Event types"
            options={toOptions(EVENT_CATEGORIES)}
            selected={categories}
            onChange={setCategories}
          />
        </div>
      </div>

      <div className="calendar__weeks">
        {Array.from({ length: WEEKS_SHOWN }, (_, i) => {
          const start = addDays(weekStart, i * 7);
          return (
            <WeekRow
              key={start.toISOString()}
              weekStart={start}
              events={visibleEvents}
              onSelect={(item) => setSelection(selectionFor(item))}
            />
          );
        })}
      </div>

      {adding && <EventFormModal onSave={addEvent} onClose={() => setAdding(false)} />}
      <ItemEditor selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}
