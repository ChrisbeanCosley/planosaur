import { useRef, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import FilterMenu from '../components/FilterMenu';
import SearchToggle from '../components/SearchToggle';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import ItemEditor from '../components/ItemEditor';
import { TASK_CATEGORIES, toOptions } from '../data/categories';
import { addDays, DAY_LABELS, formatShortDate, fromKey, startOfDay, startOfWeek, todayKey, toKey } from '../utils/date';
import { byStartTime, taskState } from '../utils/tasks';
import './Tasks.css';

const dayLabel = (date) => (toKey(date) === todayKey() ? 'Today' : formatShortDate(date));

// "This week", or a range like "Oct 12 – 18" / "Sep 28 – Oct 4".
function weekLabel(weekStart) {
  if (toKey(startOfWeek(new Date())) === toKey(weekStart)) return 'This week';
  const end = addDays(weekStart, 6);
  const endText = end.getMonth() === weekStart.getMonth() ? end.getDate() : formatShortDate(end);
  return `${formatShortDate(weekStart)} – ${endText}`;
}

export default function Tasks() {
  const { tasks, addTask, toggleTask } = useAppData();
  const [view, setView] = useState('day'); // 'day' | 'week'
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [addingOn, setAddingOn] = useState(null); // date key the new task defaults to, or null
  const [selection, setSelection] = useState(null); // task being edited
  const dateInput = useRef(null);
  const openTask = (task) => setSelection({ kind: 'task', id: task.id });

  const key = toKey(date);
  const weekStart = startOfWeek(date);
  const step = view === 'week' ? 7 : 1;
  const label = view === 'week' ? (d) => weekLabel(startOfWeek(d)) : dayLabel;

  const q = query.trim().toLowerCase();
  const visibleTasks = tasks
    .filter(
      (t) =>
        (!q || `${t.title} ${t.description}`.toLowerCase().includes(q)) &&
        (categories.length === 0 || categories.includes(t.category)),
    )
    .sort(byStartTime);

  // New tasks default to the selected day; in week view, today if it's in that week.
  const today = todayKey();
  const weekKeys = DAY_LABELS.map((_, i) => toKey(addDays(weekStart, i)));
  const defaultAddDate = view === 'day' ? key : weekKeys.includes(today) ? today : weekKeys[0];

  const openDatePicker = () => {
    const input = dateInput.current;
    if (input?.showPicker) input.showPicker();
    else input?.click();
  };

  return (
    <div className="tasks">
      <h1 className="page-title">Tasks</h1>

      <div className="toolbar tasks__toolbar">
        <div className="tasks__nav">
          <div className="view-toggle" role="group" aria-label="View">
            {['day', 'week'].map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? 'is-active' : ''}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v === 'day' ? 'Day' : 'Week'}
              </button>
            ))}
          </div>

          <div className="tasks__dates">
            <button type="button" onClick={() => setDate((d) => addDays(d, -step))}>
              {label(addDays(date, -step))}
            </button>
            <button type="button" className="tasks__date--current" onClick={() => setDate(startOfDay(new Date()))}>
              {label(date)}
            </button>
            <button type="button" onClick={() => setDate((d) => addDays(d, step))}>
              {label(addDays(date, step))}
            </button>
            <button type="button" className="icon-button" onClick={openDatePicker} aria-label="Pick a date">
              <CalendarDays size={19} strokeWidth={1.6} />
            </button>
            <input
              ref={dateInput}
              type="date"
              className="visually-hidden"
              value={key}
              onChange={(e) => e.target.value && setDate(fromKey(e.target.value))}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="toolbar__actions">
          <SearchToggle value={query} onChange={setQuery} placeholder="Search tasks" />
          <button type="button" className="btn" onClick={() => setAddingOn(defaultAddDate)}>
            <Plus size={16} strokeWidth={1.8} />
            Add Task
          </button>
          <FilterMenu
            title="Categories"
            options={toOptions(TASK_CATEGORIES)}
            selected={categories}
            onChange={setCategories}
          />
        </div>
      </div>

      {view === 'day' ? (
        <DayView
          tasks={visibleTasks.filter((t) => t.date === key)}
          categories={categories}
          onToggle={toggleTask}
          onOpen={openTask}
        />
      ) : (
        <WeekView
          weekKeys={weekKeys}
          tasks={visibleTasks}
          onToggle={toggleTask}
          onOpen={openTask}
          onAdd={setAddingOn}
        />
      )}

      {addingOn && <TaskFormModal defaultDate={addingOn} onSave={addTask} onClose={() => setAddingOn(null)} />}
      <ItemEditor selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}

// One column per category, with open / overdue / done groups.
function DayView({ tasks, categories, onToggle, onOpen }) {
  const columns = Object.entries(TASK_CATEGORIES).filter(
    ([value]) => categories.length === 0 || categories.includes(value),
  );

  return (
    <div className="tasks__columns">
      {columns.map(([value, category]) => {
        const columnTasks = tasks.filter((t) => t.category === value);
        const groups = { open: [], overdue: [], done: [] };
        columnTasks.forEach((t) => groups[taskState(t)].push(t));

        return (
          <section key={value} className="tasks__column">
            <h2 className="tasks__column-title">
              <span style={{ background: category.color }} />
              {category.label.toUpperCase()}
            </h2>

            {columnTasks.length === 0 && <p className="empty-state">No tasks</p>}
            {groups.open.map((task) => (
              <TaskCard key={task.id} task={task} state="open" onToggle={onToggle} onOpen={onOpen} />
            ))}

            {groups.overdue.length > 0 && <div className="label-divider label-divider--danger">OVERDUE</div>}
            {groups.overdue.map((task) => (
              <TaskCard key={task.id} task={task} state="overdue" onToggle={onToggle} onOpen={onOpen} />
            ))}

            {groups.done.length > 0 && <div className="label-divider">DONE</div>}
            {groups.done.map((task) => (
              <TaskCard key={task.id} task={task} state="done" onToggle={onToggle} onOpen={onOpen} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

// Monday–Sunday columns, each listing that day's tasks in time order.
function WeekView({ weekKeys, tasks, onToggle, onOpen, onAdd }) {
  const today = todayKey();

  return (
    <div className="tasks__week">
      {weekKeys.map((dayKey, i) => {
        const dayTasks = tasks.filter((t) => t.date === dayKey);
        return (
          <section key={dayKey} className={`tasks__week-day${dayKey === today ? ' tasks__week-day--today' : ''}`}>
            <header className="tasks__week-header">
              <div>
                <div className="tasks__week-label">{DAY_LABELS[i]}</div>
                <div className="tasks__week-number">{fromKey(dayKey).getDate()}</div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => onAdd(dayKey)}
                aria-label={`Add task on ${formatShortDate(fromKey(dayKey))}`}
              >
                <Plus size={16} strokeWidth={1.8} />
              </button>
            </header>
            <div className="tasks__week-list">
              {dayTasks.map((task) => (
                <TaskCard key={task.id} task={task} state={taskState(task)} onToggle={onToggle} onOpen={onOpen} compact />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
