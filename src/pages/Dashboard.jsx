import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import IncomeExpenseChart from '../components/IncomeExpenseChart';
import TaskCard from '../components/TaskCard';
import ItemEditor, { selectionFor } from '../components/ItemEditor';
import WeekRow from '../components/WeekRow';
import { EVENT_CATEGORIES } from '../data/categories';
import { startOfWeek, todayKey } from '../utils/date';
import { CHART_MONTHS, netForWindow } from '../utils/finance';
import { formatMoney } from '../utils/money';
import { byStartTime, calendarItems, taskState } from '../utils/tasks';
import './Dashboard.css';

export default function Dashboard() {
  const { events, tasks, invoices, expenses, toggleTask, loadSampleData } = useAppData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [selection, setSelection] = useState(null); // task or event being edited
  const net = netForWindow(invoices, expenses);
  const isEmpty = events.length === 0 && tasks.length === 0 && invoices.length === 0;

  const seed = async () => {
    setSeeding(true);
    await loadSampleData();
    setSeeding(false);
  };

  const q = query.trim().toLowerCase();
  const matches = (text) => !q || text.toLowerCase().includes(q);

  const weekStart = startOfWeek(new Date());
  const weekEvents = calendarItems(events, tasks).filter((e) => matches(e.title) && (!category || e.category === category));

  const today = todayKey();
  const todaysTasks = tasks
    .filter((t) => t.date === today && !t.done && matches(`${t.title} ${t.description}`))
    // High-priority tasks first, then by time.
    .sort((a, b) => (b.priority === 'high') - (a.priority === 'high') || byStartTime(a, b))
    .slice(0, 3);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="page-title">Dashboard</h1>
        <div className="dashboard__search">
          <Search size={16} strokeWidth={1.8} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter events">
            <option value="">Filter</option>
            {Object.entries(EVENT_CATEGORIES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {isEmpty && (
        <div className="card dashboard__welcome">
          <div>
            <h2>Welcome to Planosaur 🦕</h2>
            <p>Your account is empty. Add your own tasks, events and invoices, or load some sample data to explore.</p>
          </div>
          <button type="button" className="btn" onClick={seed} disabled={seeding}>
            {seeding ? 'Loading…' : 'Load sample data'}
          </button>
        </div>
      )}

      <div className="dashboard__top">
        <section className="card dashboard__chart">
          <h2 className="card__title">Income and Expense</h2>
          <IncomeExpenseChart />
          <footer className="dashboard__chart-footer">
            <div className="legend">
              <span>
                Income <i style={{ background: 'var(--pink)' }} />
              </span>
              <span>
                Expense <i style={{ background: 'var(--purple)' }} />
              </span>
            </div>
            <div className="balance">
              <span>Net ({CHART_MONTHS} months):</span>
              <strong>{(net < 0 ? '−' : '') + formatMoney(Math.abs(net)).replace('R', 'R ')}</strong>
            </div>
          </footer>
        </section>

        <section className="card dashboard__tasks">
          <h2 className="card__title">Today’s Tasks</h2>
          <div className="dashboard__task-list">
            {todaysTasks.length === 0 && <p className="empty-state">Nothing left for today 🎉</p>}
            {todaysTasks.map((task) => (
              <div key={task.id} className="task-card-compact-wrap">
                <TaskCard
                  task={task}
                  state={taskState(task)}
                  onToggle={toggleTask}
                  onOpen={(t) => setSelection({ kind: 'task', id: t.id })}
                  showBolt
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card dashboard__week">
        <header className="dashboard__week-header">
          <h2 className="card__title">Your week</h2>
          <span>
            {weekStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </header>
        <WeekRow weekStart={weekStart} events={weekEvents} onSelect={(item) => setSelection(selectionFor(item))} />
      </section>

      <ItemEditor selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}
