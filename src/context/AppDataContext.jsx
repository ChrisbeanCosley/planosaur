import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import * as api from '../lib/api';
import { newId } from '../data/seed';

const AppDataContext = createContext(null);

const initialState = {
  tasks: [],
  events: [],
  invoices: [],
  clients: [],
  expenses: [],
  expensesMissing: false,
  receipts: [],
  receiptsMissing: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.data;
    case 'task/add':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'task/toggle':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
      };
    case 'task/update':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) };
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'event/add':
      return { ...state, events: [...state.events, action.event] };
    case 'event/update':
      return { ...state, events: state.events.map((e) => (e.id === action.event.id ? action.event : e)) };
    case 'event/delete':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case 'expense/add':
      return { ...state, expenses: [...state.expenses, action.expense] };
    case 'expense/update':
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e)),
      };
    case 'expense/delete':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
        receipts: state.receipts.filter((r) => r.expenseId !== action.id),
      };
    case 'receipt/add':
      return { ...state, receipts: [...state.receipts, action.receipt] };
    case 'receipt/delete':
      return { ...state, receipts: state.receipts.filter((r) => r.id !== action.id) };
    case 'client/add':
      if (state.clients.some((c) => c.id === action.client.id)) return state;
      return {
        ...state,
        clients: [...state.clients, action.client].sort((a, b) => a.name.localeCompare(b.name)),
      };
    case 'invoice/save': {
      const exists = state.invoices.some((i) => i.id === action.invoice.id);
      return {
        ...state,
        invoices: exists
          ? state.invoices.map((i) => (i.id === action.invoice.id ? action.invoice : i))
          : [...state.invoices, action.invoice],
      };
    }
    case 'invoice/update':
      return {
        ...state,
        invoices: state.invoices.map((i) => (action.ids.includes(i.id) ? { ...i, ...action.patch } : i)),
      };
    case 'invoice/delete':
      return { ...state, invoices: state.invoices.filter((i) => !action.ids.includes(i.id)) };
    default:
      return state;
  }
}

export function AppDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      dispatch({ type: 'load', data: await api.fetchAll() });
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus((s) => (s === 'loading' ? 'error' : s));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Changes are applied on screen straight away, then saved. If saving fails we
  // show the error and reload, so the screen never drifts from the database.
  const persist = useCallback(
    (promise) =>
      promise.catch((err) => {
        setError(err.message);
        reload();
      }),
    [reload],
  );

  const value = useMemo(
    () => ({
      ...state,
      status,
      error,
      clearError: () => setError(null),
      reload,

      addTask: (task) => {
        const full = { id: newId(), done: false, description: '', ...task };
        dispatch({ type: 'task/add', task: full });
        persist(api.insertTask(full));
      },
      toggleTask: (id) => {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        dispatch({ type: 'task/toggle', id });
        persist(api.setTaskDone(id, !task.done));
      },
      updateTask: (id, changes) => {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        const full = { ...task, ...changes, id };
        dispatch({ type: 'task/update', task: full });
        persist(api.updateTask(full));
      },
      deleteTask: (id) => {
        dispatch({ type: 'task/delete', id });
        persist(api.deleteTask(id));
      },
      addEvent: (event) => {
        const full = { id: newId(), ...event };
        dispatch({ type: 'event/add', event: full });
        persist(api.insertEvent(full));
      },
      updateEvent: (id, changes) => {
        const event = state.events.find((e) => e.id === id);
        if (!event) return;
        const full = { ...event, ...changes, id };
        dispatch({ type: 'event/update', event: full });
        persist(api.updateEvent(full));
      },
      deleteEvent: (id) => {
        dispatch({ type: 'event/delete', id });
        persist(api.deleteEvent(id));
      },
      // Expense saves return their promise so the form can wait (e.g. before uploading receipts).
      addExpense: (expense) => {
        const full = { id: newId(), description: '', ...expense };
        dispatch({ type: 'expense/add', expense: full });
        const saving = api.insertExpense(full);
        persist(saving);
        return saving;
      },
      updateExpense: (id, changes) => {
        const expense = state.expenses.find((e) => e.id === id);
        if (!expense) return Promise.resolve();
        const full = { ...expense, ...changes, id };
        dispatch({ type: 'expense/update', expense: full });
        const saving = api.updateExpense(full);
        persist(saving);
        return saving;
      },
      deleteExpense: (id) => {
        const paths = state.receipts.filter((r) => r.expenseId === id).map((r) => r.path);
        dispatch({ type: 'expense/delete', id });
        persist(api.deleteExpense(id, paths));
      },
      // Uploads first, then shows it: there's nothing to display until the file is stored.
      addReceipt: async (expenseId, file) => {
        const receipt = await api.uploadReceipt(expenseId, file);
        dispatch({ type: 'receipt/add', receipt });
        return receipt;
      },
      removeReceipt: (receipt) => {
        dispatch({ type: 'receipt/delete', id: receipt.id });
        const removing = api.deleteReceipt(receipt);
        persist(removing);
        return removing;
      },
      saveInvoice: (invoice) => {
        dispatch({ type: 'invoice/save', invoice });
        persist(api.saveInvoice(invoice).then((client) => dispatch({ type: 'client/add', client })));
      },
      updateInvoices: (ids, patch) => {
        dispatch({ type: 'invoice/update', ids, patch });
        persist(api.updateInvoices(ids, patch));
      },
      deleteInvoices: (ids) => {
        dispatch({ type: 'invoice/delete', ids });
        persist(api.deleteInvoices(ids));
      },
      loadSampleData: async () => {
        await persist(api.seedSampleData());
        await reload();
      },
    }),
    [state, status, error, persist, reload],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
