import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDollarSign, Download, FileText, Play, Plus, Square } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import TimeEntryModal from '../components/TimeEntryModal';
import InvoiceTimeModal from '../components/InvoiceTimeModal';
import ExportTimesheetModal from '../components/ExportTimesheetModal';
import { addDays, DAY_LABELS, fromKey, startOfDay, startOfWeek, todayKey, toKey, weekLabel } from '../utils/date';
import { formatMoney } from '../utils/money';
import { durationSeconds, entryAmount, entryDateKey, formatClock, formatDuration, lastRate, timeOfDay } from '../utils/time';
import './TimeTracking.css';

// Re-renders every second while a timer runs, so durations stay live.
function useNow(active) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return undefined;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

// "This month", or "September" (with the year when it isn't this year).
function monthLabel(date) {
  const now = new Date();
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) return 'This month';
  return date.toLocaleDateString('en-US', date.getFullYear() === now.getFullYear() ? { month: 'long' } : { month: 'short', year: 'numeric' });
}

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1);

// The date keys a period covers: Mon–Sun for a week, every day for a month.
function periodKeys(view, anchor) {
  if (view === 'week') {
    const start = startOfWeek(anchor);
    return DAY_LABELS.map((_, i) => toKey(addDays(start, i)));
  }
  const first = startOfMonth(anchor);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => toKey(addDays(first, i)));
}

export default function TimeTracking() {
  const { timeEntries, timeEntriesMissing, clients, invoices } = useAppData();
  const [view, setView] = useState('week'); // 'week' | 'month'
  const [anchor, setAnchor] = useState(() => startOfDay(new Date())); // any day in the period shown
  const [editing, setEditing] = useState(null); // entry, { date } for a new one, or null
  const [invoicing, setInvoicing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const running = timeEntries.find((t) => !t.end);
  const now = useNow(Boolean(running));
  const clientName = (id) => clients.find((c) => c.id === id)?.name;

  const keys = periodKeys(view, anchor);
  const keySet = new Set(keys);
  const periodEntries = timeEntries.filter((t) => keySet.has(entryDateKey(t)));
  const totalSeconds = periodEntries.reduce((s, t) => s + durationSeconds(t, now), 0);
  const billableSeconds = periodEntries.filter((t) => t.billable).reduce((s, t) => s + durationSeconds(t, now), 0);
  // Already-invoiced time isn't counted: it's been billed.
  const billableAmount = periodEntries.filter((t) => !t.invoiceId).reduce((s, t) => s + entryAmount(t, now), 0);

  const stats = [
    { label: 'Total time', value: formatDuration(totalSeconds) },
    { label: 'Billable time', value: formatDuration(billableSeconds) },
    { label: 'Billable amount', value: formatMoney(billableAmount) },
    { label: 'Entries', value: periodEntries.length },
  ];

  // Newest day first, newest entry first within a day; empty days are skipped.
  const days = [...keys]
    .reverse()
    .map((key) => ({
      key,
      entries: periodEntries.filter((t) => entryDateKey(t) === key).sort((a, b) => b.start.localeCompare(a.start)),
    }))
    .filter((d) => d.entries.length > 0);

  const today = todayKey();
  const defaultDate = keySet.has(today) ? today : keys[0];

  // Navigation steps a week or a month at a time.
  const step = (n) => setAnchor((d) => (view === 'week' ? addDays(d, n * 7) : addMonths(d, n)));
  const label = (n) =>
    view === 'week' ? weekLabel(startOfWeek(addDays(anchor, n * 7))) : monthLabel(addMonths(anchor, n));

  const openDay = (key) => {
    const section = document.getElementById(`time-day-${key}`);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else setEditing({ date: key }); // empty day: add time on it
  };

  return (
    <div className="time">
      <h1 className="page-title">Time Tracking</h1>

      {timeEntriesMissing ? (
        <div className="card expenses__setup">
          <strong>One more database step</strong>
          <p>
            Run <code>supabase/migrations/0006_time_entries.sql</code> in the Supabase SQL Editor, then refresh this page
            to start tracking time.
          </p>
        </div>
      ) : (
        <TimerBar running={running} now={now} onEdit={setEditing} />
      )}

      <div className="toolbar time__toolbar">
        <div className="tasks__nav">
          <div className="view-toggle" role="group" aria-label="View">
            {['week', 'month'].map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? 'is-active' : ''}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <div className="tasks__dates">
            <button type="button" onClick={() => step(-1)}>
              {label(-1)}
            </button>
            <button type="button" className="tasks__date--current" onClick={() => setAnchor(startOfDay(new Date()))}>
              {label(0)}
            </button>
            <button type="button" onClick={() => step(1)}>
              {label(1)}
            </button>
          </div>
        </div>
        <div className="toolbar__actions">
          <button type="button" className="btn btn--pink" onClick={() => setExporting(true)} disabled={timeEntriesMissing}>
            <Download size={15} strokeWidth={1.8} />
            Export timesheet
          </button>
          <button type="button" className="btn" onClick={() => setInvoicing(true)} disabled={timeEntriesMissing}>
            <FileText size={16} strokeWidth={1.8} />
            Create invoice
          </button>
          <button
            type="button"
            className="btn btn--green"
            onClick={() => setEditing({ date: defaultDate })}
            disabled={timeEntriesMissing}
          >
            <Plus size={16} strokeWidth={1.8} />
            Add time
          </button>
        </div>
      </div>

      <section className="expenses__stats time__stats">
        {stats.map((s) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      {view === 'month' && <MonthGrid keys={keys} entries={periodEntries} now={now} onDay={openDay} />}

      <div className="time__days">
        {days.length === 0 && <p className="empty-state">No time tracked this {view}.</p>}
        {days.map(({ key, entries }) => {
          const date = fromKey(key);
          const dayTotal = entries.reduce((s, t) => s + durationSeconds(t, now), 0);
          return (
            <section key={key} id={`time-day-${key}`} className="card time__day">
              <header className="time__day-header">
                <h2>
                  {key === today ? 'Today' : DAY_LABELS[(date.getDay() + 6) % 7]}
                  <span>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </h2>
                <strong>{formatDuration(dayTotal)}</strong>
              </header>
              <ul className="time__entries">
                {entries.map((entry) => {
                  const amount = entryAmount(entry, now);
                  const invoice = entry.invoiceId && invoices.find((i) => i.id === entry.invoiceId);
                  return (
                    <li key={entry.id} className="time__entry-row">
                      <button type="button" className="time__entry" onClick={() => setEditing(entry)} title="Edit time">
                        <span className="time__entry-main">
                          <span className="time__entry-desc">{entry.description || 'No description'}</span>
                          {clientName(entry.clientId) && <span className="time__entry-client">{clientName(entry.clientId)}</span>}
                        </span>
                        <span className="time__entry-range">
                          {timeOfDay(entry.start)} – {entry.end ? timeOfDay(entry.end) : 'now'}
                        </span>
                        <span className={`time__entry-billable${entry.billable ? ' is-on' : ''}`} title={entry.billable ? 'Billable' : 'Not billable'}>
                          <CircleDollarSign size={14} strokeWidth={1.8} />
                        </span>
                        <span className="time__entry-amount">{amount ? formatMoney(amount) : ''}</span>
                        <span className={`time__entry-duration${entry.end ? '' : ' is-running'}`}>
                          {formatDuration(durationSeconds(entry, now))}
                        </span>
                      </button>
                      {invoice && (
                        <Link to={`/invoices/${invoice.id}`} className="time__invoiced" title={`Billed on ${invoice.number}`}>
                          Invoiced
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {invoicing && <InvoiceTimeModal onClose={() => setInvoicing(false)} />}

      {exporting && (
        <ExportTimesheetModal defaultMonth={keys[keys.length - 1].slice(0, 7)} onClose={() => setExporting(false)} />
      )}

      {editing && (
        <TimeEntryModal
          key={editing.id ?? `new-${editing.date}`}
          entry={editing.id ? editing : null}
          defaultDate={editing.date ?? defaultDate}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// Calendar of the month: each day shows its hours, shaded by how busy it was.
function MonthGrid({ keys, entries, now, onDay }) {
  const today = todayKey();
  const secondsByDay = {};
  entries.forEach((t) => {
    const key = entryDateKey(t);
    secondsByDay[key] = (secondsByDay[key] ?? 0) + durationSeconds(t, now);
  });
  const busiest = Math.max(1, ...Object.values(secondsByDay));
  const leadingBlanks = (fromKey(keys[0]).getDay() + 6) % 7; // Monday-first grid

  return (
    <section className="card time__month" aria-label="Hours per day">
      {DAY_LABELS.map((d) => (
        <div key={d} className="time__month-label">
          {d}
        </div>
      ))}
      {Array.from({ length: leadingBlanks }, (_, i) => (
        <div key={`blank-${i}`} />
      ))}
      {keys.map((key) => {
        const seconds = secondsByDay[key] ?? 0;
        const date = fromKey(key);
        return (
          <button
            key={key}
            type="button"
            className={`time__month-day${key === today ? ' is-today' : ''}${seconds ? ' has-time' : ''}`}
            style={seconds ? { '--busy': 0.15 + 0.6 * (seconds / busiest) } : undefined}
            onClick={() => onDay(key)}
            title={seconds ? `${formatDuration(seconds)} tracked` : 'Add time on this day'}
          >
            <span className="time__month-date">{date.getDate()}</span>
            {seconds > 0 && <span className="time__month-hours">{formatDuration(seconds)}</span>}
          </button>
        );
      })}
    </section>
  );
}

// "What are you working on?" + Start, or the running timer + Stop.
function TimerBar({ running, now, onEdit }) {
  const { clients, timeEntries, startTimer, stopTimer } = useAppData();
  const [form, setForm] = useState({ description: '', client: '', billable: true, rate: lastRate(timeEntries, null) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setClient = (e) => {
    const name = e.target.value;
    const match = clients.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setForm((f) => ({ ...f, client: name, rate: match ? lastRate(timeEntries, match.id) : f.rate }));
  };

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await startTimer({
        description: form.description.trim(),
        clientName: form.client,
        billable: form.billable,
        rate: form.rate === '' ? null : Number(form.rate),
      });
      setForm((f) => ({ ...f, description: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    setError('');
    try {
      await stopTimer(running.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (running) {
    const client = clients.find((c) => c.id === running.clientId)?.name;
    return (
      <div className="card timer timer--running">
        <button type="button" className="timer__running-info" onClick={() => onEdit(running)} title="Edit this timer">
          <span className="timer__pulse" aria-hidden="true" />
          <span>
            <strong>{running.description || 'Working…'}</strong>
            {client && <span className="timer__client">{client}</span>}
          </span>
        </button>
        <span className="timer__clock" aria-live="off">
          {formatClock(durationSeconds(running, now))}
        </span>
        <button type="button" className="btn btn--danger" onClick={stop} disabled={busy}>
          <Square size={14} strokeWidth={2} fill="currentColor" /> Stop
        </button>
        {error && <p className="form-error timer__error">{error}</p>}
      </div>
    );
  }

  return (
    <form className="card timer" onSubmit={start}>
      <input
        className="field timer__desc"
        value={form.description}
        onChange={set('description')}
        placeholder="What are you working on?"
        aria-label="What are you working on?"
      />
      <input
        className="field timer__client-input"
        list="timer-client-list"
        value={form.client}
        onChange={setClient}
        placeholder="Client"
        aria-label="Client"
      />
      <datalist id="timer-client-list">
        {clients.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <input
        className="field timer__rate"
        type="number"
        min="0"
        step="0.01"
        value={form.rate}
        onChange={set('rate')}
        placeholder="R / hour"
        aria-label="Hourly rate"
      />
      <button
        type="button"
        className={`icon-button timer__billable${form.billable ? ' is-on' : ''}`}
        onClick={() => setForm((f) => ({ ...f, billable: !f.billable }))}
        aria-pressed={form.billable}
        title={form.billable ? 'Billable' : 'Not billable'}
      >
        <CircleDollarSign size={19} strokeWidth={1.8} />
      </button>
      <span className="timer__clock timer__clock--idle">00:00:00</span>
      <button type="submit" className="btn btn--green" disabled={busy}>
        <Play size={14} strokeWidth={2} fill="currentColor" /> Start
      </button>
      {error && <p className="form-error timer__error">{error}</p>}
    </form>
  );
}
