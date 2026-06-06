import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/students', label: 'Students', icon: '👨‍🎓' },
  { path: '/trainers', label: 'Trainers', icon: '👨‍🏫' },
  { path: '/batches', label: 'Batches', icon: '📚' },
  { path: '/camps', label: 'Camps', icon: '⛺' },
  { path: '/attendance', label: 'Attendance', icon: '✅' },
  { path: '/payments', label: 'Payments', icon: '💳' },
  { path: '/reconciliation', label: 'Reconciliation', icon: '⚖️' },
  { path: '/payroll', label: 'Payroll', icon: '💰' },
  { path: '/reminders', label: 'Reminders', icon: '📱' },
  { path: '/profit', label: 'Profit', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">♟️ Chess Academy</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.filter(item => {
            if (user?.role === 'trainer') {
              return ['/','batches','/attendance','/payments'].some(p => item.path === p);
            }
            return true;
          }).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.first_name || user?.username}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1 className="page-title">Chess Academy</h1>
          <div className="topbar-right">
            <span className="user-chip">{user?.first_name || user?.username} ({user?.role})</span>
          </div>
        </header>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
