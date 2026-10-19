import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ChartNoAxesColumn,
  FileCheck,
  FileText,
  Landmark,
  SlidersHorizontal,
  Timer,
} from 'lucide-react';
import logo from '../assets/logo.png';
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

// Placeholder until there's real auth / a user profile.
const USER = { name: 'Anna B.', initials: 'AB' };

export default function Sidebar() {
  return (
    <aside className="sidebar no-print">
      <div className="sidebar__avatar" aria-hidden="true">
        {USER.initials}
      </div>
      <div className="sidebar__name">{USER.name}</div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
          >
            <Icon size={26} strokeWidth={1.6} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <hr className="sidebar__divider" />

      <footer className="sidebar__footer">
        <img src={logo} alt="" className="sidebar__logo" />
        <span>© Planosaur, {new Date().getFullYear()}.</span>
      </footer>
    </aside>
  );
}
