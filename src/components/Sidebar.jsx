import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ChartNoAxesColumn,
  FileCheck,
  FileText,
  Landmark,
  LogOut,
  SlidersHorizontal,
  Timer,
} from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: ChartNoAxesColumn },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/banking', label: 'Banking', icon: Landmark },
  { to: '/time-tracking', label: 'Time Tracking', icon: Timer },
  { to: '/tasks', label: 'Tasks', icon: FileCheck },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export default function Sidebar() {
  const { name, signOut } = useAuth();

  return (
    <aside className="sidebar no-print">
      <div className="sidebar__avatar" aria-hidden="true">
        {initialsOf(name)}
      </div>
      <div className="sidebar__name">{name}</div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.6} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <hr className="sidebar__divider" />

      <button type="button" className="sidebar__link sidebar__signout" onClick={signOut}>
        <LogOut size={16} strokeWidth={1.6} />
        <span>Sign out</span>
      </button>

      <footer className="sidebar__footer">
        <img src={logo} alt="" className="sidebar__logo" />
        <span>© Planosaur, {new Date().getFullYear()}.</span>
      </footer>
    </aside>
  );
}
