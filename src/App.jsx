import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Invoices from './pages/Invoices';
import InvoiceEditor from './pages/InvoiceEditor';
import Tasks from './pages/Tasks';
import ComingSoon from './pages/ComingSoon';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceEditor />} />
        <Route path="invoices/:id" element={<InvoiceEditor />} />
        <Route path="banking" element={<ComingSoon title="Banking" />} />
        <Route path="time-tracking" element={<ComingSoon title="Time Tracking" />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
