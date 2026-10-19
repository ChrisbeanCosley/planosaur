# Planosaur 🦕

A planning and invoicing app built with React + Vite.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Project layout

```
src/
  App.jsx                 Routes
  context/AppDataContext  App-wide state (events, tasks, invoices) via useReducer
  data/seed.js            Demo data, generated relative to today
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

Data lives in memory only; it resets on refresh until a backend/API is added.
