import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import Splash from './Splash';
import { useAppData } from '../context/AppDataContext';
import './Layout.css';

export default function Layout() {
  const { status, error, clearError, reload } = useAppData();

  return (
    <div className="app">
      <Sidebar />
      <main className="app__main">
        {status === 'loading' && <Splash message="Loading your data…" />}

        {status === 'error' && (
          <div className="load-error card">
            <h2>Couldn’t load your data</h2>
            <p>{error}</p>
            <p className="load-error__hint">
              If this is a new Supabase project, run <code>supabase/migrations/0001_initial_schema.sql</code> in the
              Supabase SQL Editor first.
            </p>
            <button type="button" className="btn" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            {error && (
              <div className="error-banner no-print" role="alert">
                <span>Something didn’t save: {error}</span>
                <button type="button" className="icon-button" onClick={clearError} aria-label="Dismiss">
                  <X size={12} />
                </button>
              </div>
            )}
            <Outlet />
          </>
        )}
      </main>
    </div>
  );
}
