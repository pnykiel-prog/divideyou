import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  perm?: string;
}

const NAV: NavItem[] = [
  { to: '/users', icon: '👥', label: 'Users', perm: 'USER_DATA' },
  { to: '/users-cms', icon: '🛡️', label: 'Admins', perm: 'USER_DATA' },
  { to: '/payments/pay-in', icon: '💳', label: 'Payments', perm: 'PAYMENT' },
  { to: '/programs', icon: '📦', label: 'Programs', perm: 'PROGRAM' },
  { to: '/bonuses', icon: '🎁', label: 'Bonuses', perm: 'BONUS' },
  { to: '/parameters', icon: '⚙️', label: 'Parameters', perm: 'SETTINGS' },
  { to: '/regulations', icon: '📜', label: 'Regulations', perm: 'TERMS' },
  { to: '/faq', icon: '❓', label: 'FAQ', perm: 'FAQ' },
  { to: '/statistics', icon: '📊', label: 'Statistics', perm: 'STATISTICS' },
  { to: '/news', icon: '📰', label: 'News', perm: 'NEWS' },
  { to: '/system-partners', icon: '🤝', label: 'System Partners', perm: 'USER_PARTNERSHIP' },
  { to: '/files', icon: '📁', label: 'Files', perm: 'FILES' },
];

export default function Layout() {
  const { admin, logout, can } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          Divide<span>You</span> CMS
        </div>
        <div className="side-id">
          Signed in as <b>{admin?.name || admin?.email}</b>
          {admin?.superAdmin && (
            <>
              {' '}
              <span className="badge blue">Super</span>
            </>
          )}
        </div>
        <nav>
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">DivideYou CMS · admin panel</div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="spacer" />
          <span className="muted">{admin?.email}</span>
          <button className="btn ghost sm" onClick={logout}>
            Logout
          </button>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
