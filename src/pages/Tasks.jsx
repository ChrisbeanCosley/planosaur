import { useRef, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import FilterMenu from '../components/FilterMenu';
import SearchToggle from '../components/SearchToggle';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import ItemEditor from '../components/ItemEditor';
import { TASK_CATEGORIES, toOptions } from '../data/categories';
import { addDays, formatShortDate, fromKey, startOfDay, todayKey, toKey } from '../utils/date';
import { byStartTime, taskState } from '../utils/tasks';
import './Tasks.css';

const dayLabel = (date) => (toKey(date) === todayKey() ? 'Today' : formatShortDate(date));

export default function Tasks() {
  const { tasks, addTask, toggleTask } = useAppData();
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selection, setSelection] = useState(null); // task or event being edited
  const dateInput = useRef(null);
  const openTask = (task) => setSelection({ kind: 'task', id: task.id });

  const key = toKey(date);
  const q = query.trim().toLowerCase();
  const dayTasks = tasks
    .filter((t) => t.date === key && (!q || `${t.title} ${t.description}`.toLowerCase().includes(q)))
    .sort(byStartTime);

  const columns = Object.entries(TASK_CATEGORIES).filter(
    ([value]) => categories.length === 0 || categories.includes(value),
  );

  const openDatePicker = () => {
    const input = dateInput.current;
    if (input?.showPicker) input.showPicker();
    else input?.click();
  };

  return (
    <div className="tasks">
      <h1 className="page-title">Tasks</h1>

      <div className="toolbar tasks__toolbar">
        <div className="tasks__dates">
          <button type="button" onClick={() => setDate((d) => addDays(d, -1))}>
            {dayLabel(addDays(date, -1))}
          </button>
          <button type="button" className="tasks__date--current" onClick={() => setDate(startOfDay(new Date()))}>
            {dayLabel(date)}
          </button>
          <button type="button" onClick={() => setDate((d) => addDays(d, 1))}>
            {dayLabel(addDays(date, 1))}
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
        <div className="toolbar__actions">
          <SearchToggle value={query} onChange={setQuery} placeholder="Search tasks" />
          <button type="button" className="btn" onClick={() => setAdding(true)}>
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

      <div className="tasks__columns">
        {columns.map(([value, category]) => {
          const columnTasks = dayTasks.filter((t) => t.category === value);
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
                <TaskCard key={task.id} task={task} state="open" onToggle={toggleTask} onOpen={openTask} />
              ))}

              {groups.overdue.length > 0 && <div className="label-divider label-divider--danger">OVERDUE</div>}
              {groups.overdue.map((task) => (
                <TaskCard key={task.id} task={task} state="overdue" onToggle={toggleTask} onOpen={openTask} />
              ))}

              {groups.done.length > 0 && <div className="label-divider">DONE</div>}
              {groups.done.map((task) => (
                <TaskCard key={task.id} task={task} state="done" onToggle={toggleTask} onOpen={openTask} />
              ))}
            </section>
          );
        })}
      </div>

      {adding && <TaskFormModal defaultDate={key} onSave={addTask} onClose={() => setAdding(false)} />}
      <ItemEditor selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}
