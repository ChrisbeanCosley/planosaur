# Planosaur 🦕

A planning and invoicing app built with React + Vite.

## Getting started

1. Copy `.env.example` to `.env` and fill in your Supabase project URL and publishable key
   (Supabase dashboard → Project Settings → API). `.env` is git-ignored.
2. In the Supabase SQL Editor, run `supabase/migrations/0001_initial_schema.sql` once.
3. Run the app:

```bash
npm install
npm run dev
```

Then open http://localhost:5173, create an account, and optionally click **Load sample data** on the dashboard.

## Project layout

```
src/
  App.jsx                 Routes
  context/AuthContext     Supabase sign-in session
  context/AppDataContext  App-wide state (events, tasks, invoices, clients), loaded from Supabase
  lib/                    Supabase client and all database reads/writes (api.js)
  data/seed.js            Optional sample data for new accounts, generated relative to today
  data/categories.js      Colours/labels for event & task categories
  components/             Sidebar, Layout, EventCard, TaskCard, WeekRow, chart, modals, toolbar bits
  pages/                  Dashboard, Calendar, Tasks, Invoices, InvoiceEditor, ComingSoon
  utils/                  Date, money, invoice and task helpers
  styles/global.css       Theme tokens (colours, radius, shadows) and shared styles
```

## Status

| Screen | State |
| --- | --- |
| Dashboard | Done: chart (sample data), today's tasks, your week, search + filter |
| Calendar | Done: two-week view, prev/next, add event, search, filter by type |
| Tasks | Done: day switcher, columns per category, done/overdue groups, add task |
| Invoices | Done: tabs, summary stats, search, client filter, bulk paid/archive/delete |
| New / edit invoice | Done: line items, VAT, discount, terms → due date, print to PDF |
| Banking, Time Tracking, Settings | Placeholder |

Data is stored in Supabase (Postgres). Each user can only see their own rows (row level security).
All database calls live in `src/lib/api.js`.
