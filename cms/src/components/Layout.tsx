import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  perm?: string;
}

const NAV: NavItem[] = [
  { to: '/users', icon: '👥', label: 'Użytkownicy', perm: 'USER_DATA' },
  { to: '/users-cms', icon: '🛡️', label: 'Administratorzy', perm: 'USER_DATA' },
  { to: '/payments/pay-in', icon: '💳', label: 'Płatności', perm: 'PAYMENT' },
  { to: '/programs', icon: '📦', label: 'Programy', perm: 'PROGRAM' },
  { to: '/bonuses', icon: '🎁', label: 'Bonusy', perm: 'BONUS' },
  { to: '/parameters', icon: '⚙️', label: 'Parametry', perm: 'SETTINGS' },
  { to: '/regulations', icon: '📜', label: 'Regulaminy', perm: 'TERMS' },
  { to: '/faq', icon: '❓', label: 'FAQ', perm: 'FAQ' },
  { to: '/statistics', icon: '📊', label: 'Statystyki', perm: 'STATISTICS' },
  { to: '/news', icon: '📰', label: 'Aktualności', perm: 'NEWS' },
  { to: '/system-partners', icon: '🤝', label: 'Partnerzy systemowi', perm: 'USER_PARTNERSHIP' },
  { to: '/files', icon: '📁', label: 'Pliki', perm: 'FILES' },
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
          Zalogowano jako <b>{admin?.name || admin?.email}</b>
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
        <div className="side-foot">DivideYou CMS · panel administracyjny</div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="spacer" />
          <span className="muted">{admin?.email}</span>
          <button className="btn ghost sm" onClick={logout}>
            Wyloguj
          </button>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
