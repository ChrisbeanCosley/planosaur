import { createContext, useContext, useMemo, useReducer } from 'react';
import { createSeedData, newId } from '../data/seed';

const AppDataContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'task/add':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'task/toggle':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
      };
    case 'event/add':
      return { ...state, events: [...state.events, action.event] };
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
  const [state, dispatch] = useReducer(reducer, undefined, createSeedData);

  const value = useMemo(
    () => ({
      ...state,
      addTask: (task) => dispatch({ type: 'task/add', task: { id: newId('task'), done: false, ...task } }),
      toggleTask: (id) => dispatch({ type: 'task/toggle', id }),
      addEvent: (event) => dispatch({ type: 'event/add', event: { id: newId('event'), ...event } }),
      saveInvoice: (invoice) => dispatch({ type: 'invoice/save', invoice }),
      updateInvoices: (ids, patch) => dispatch({ type: 'invoice/update', ids, patch }),
      deleteInvoices: (ids) => dispatch({ type: 'invoice/delete', ids }),
    }),
    [state],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
