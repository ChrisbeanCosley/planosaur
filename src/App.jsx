import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './components/Splash';
import { AppDataProvider } from './context/AppDataContext';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Invoices from './pages/Invoices';
import InvoiceEditor from './pages/InvoiceEditor';
import InvoicePreview from './pages/InvoicePreview';
import Tasks from './pages/Tasks';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import TimeTracking from './pages/TimeTracking';
import Login from './pages/Login';

export default function App() {
  const { loading, user } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <Login />;

  return (
    // Keyed by user so switching accounts starts from a clean slate.
    <AppDataProvider key={user.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceEditor />} />
          <Route path="invoices/:id" element={<InvoicePreview />} />
          <Route path="invoices/:id/edit" element={<InvoiceEditor />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="banking" element={<Navigate to="/expenses" replace />} />
          <Route path="time-tracking" element={<TimeTracking />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AppDataProvider>
  );
}
