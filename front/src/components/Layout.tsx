import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api, jr } from '../api';

const links = [
  { to: '/news', label: 'News', icon: '📰' },
  { to: '/profile', label: 'Profile', icon: '👤' },
  { to: '/wallet', label: 'Wallet', icon: '💰' },
  { to: '/programs', label: 'Programs', icon: '🏢' },
  { to: '/vip-programs', label: 'VIP Programs', icon: '⭐' },
  { to: '/bonuses', label: 'Bonuses', icon: '🎁' },
  { to: '/partnership', label: 'Partnership', icon: '🤝' },
  { to: '/faq', label: 'FAQ', icon: '❓' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [active, setActive] = useState<number>(0);

  useEffect(() => {
    api.get('/wallet').then((w) => setActive(w.active)).catch(() => {});
  }, []);

  const doLogout = () => {
    logout();
    nav('/login');
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Divide<span>You</span></div>
        <div className="side-id">
          My ID: <b className="copy" onClick={() => copy(user?.clientId || '')} title="Copy">
            {(user?.clientId || '').slice(0, 8)}…
          </b>
          {user?.partnerNumber && (
            <div style={{ marginTop: 4 }}>
              Partner #: <b className="copy" onClick={() => copy(user.partnerNumber!)}>{user.partnerNumber}</b>
            </div>
          )}
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          Signed in as<br /><b>{user?.email}</b>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <strong style={{ fontSize: 16 }}>
            {user?.companyName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Welcome'}
          </strong>
          <div className="spacer" />
          <div className="wallet-chip" onClick={() => nav('/wallet')} style={{ cursor: 'pointer' }}>
            {jr(active)}
          </div>
          <button className="btn sm" onClick={doLogout}>Logout</button>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
