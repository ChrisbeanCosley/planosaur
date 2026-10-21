import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDollarSign, FileText, Play, Plus, Square } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import TimeEntryModal from '../components/TimeEntryModal';
import InvoiceTimeModal from '../components/InvoiceTimeModal';
import { addDays, DAY_LABELS, fromKey, startOfWeek, todayKey, toKey, weekLabel } from '../utils/date';
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

export default function TimeTracking() {
  const { timeEntries, timeEntriesMissing, clients, invoices } = useAppData();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editing, setEditing] = useState(null); // entry, 'new', or null
  const [invoicing, setInvoicing] = useState(false);

  const running = timeEntries.find((t) => !t.end);
  const now = useNow(Boolean(running));
  const clientName = (id) => clients.find((c) => c.id === id)?.name;

  const weekKeys = DAY_LABELS.map((_, i) => toKey(addDays(weekStart, i)));
  const weekEntries = timeEntries.filter((t) => weekKeys.includes(entryDateKey(t)));
  const totalSeconds = weekEntries.reduce((s, t) => s + durationSeconds(t, now), 0);
  const billableSeconds = weekEntries.filter((t) => t.billable).reduce((s, t) => s + durationSeconds(t, now), 0);
  // Already-invoiced time isn't counted: it's been billed.
  const billableAmount = weekEntries.filter((t) => !t.invoiceId).reduce((s, t) => s + entryAmount(t, now), 0);

  const stats = [
    { label: 'Total time', value: formatDuration(totalSeconds) },
    { label: 'Billable time', value: formatDuration(billableSeconds) },
    { label: 'Billable amount', value: formatMoney(billableAmount) },
    { label: 'Entries', value: weekEntries.length },
  ];

  // Newest day first, newest entry first within a day; empty days are skipped.
  const days = [...weekKeys]
    .reverse()
    .map((key) => ({
      key,
      entries: weekEntries.filter((t) => entryDateKey(t) === key).sort((a, b) => b.start.localeCompare(a.start)),
    }))
    .filter((d) => d.entries.length > 0);

  const today = todayKey();
  const defaultDate = weekKeys.includes(today) ? today : weekKeys[0];

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
        <div className="tasks__dates">
          <button type="button" onClick={() => setWeekStart((d) => addDays(d, -7))}>
            {weekLabel(addDays(weekStart, -7))}
          </button>
          <button type="button" className="tasks__date--current" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {weekLabel(weekStart)}
          </button>
          <button type="button" onClick={() => setWeekStart((d) => addDays(d, 7))}>
            {weekLabel(addDays(weekStart, 7))}
          </button>
        </div>
        <div className="toolbar__actions">
          <button type="button" className="btn" onClick={() => setInvoicing(true)} disabled={timeEntriesMissing}>
            <FileText size={16} strokeWidth={1.8} />
            Create invoice
          </button>
          <button type="button" className="btn btn--green" onClick={() => setEditing('new')} disabled={timeEntriesMissing}>
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

      <div className="time__days">
        {days.length === 0 && <p className="empty-state">No time tracked this week.</p>}
        {days.map(({ key, entries }) => {
          const date = fromKey(key);
          const dayTotal = entries.reduce((s, t) => s + durationSeconds(t, now), 0);
          return (
            <section key={key} className="card time__day">
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

      {editing && (
        <TimeEntryModal
          key={editing === 'new' ? 'new' : editing.id}
          entry={editing === 'new' ? null : editing}
          defaultDate={defaultDate}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
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
