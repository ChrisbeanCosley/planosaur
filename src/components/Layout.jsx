import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  );
}
