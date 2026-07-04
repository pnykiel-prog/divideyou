import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  BarChart2, Users, CreditCard, Handshake, Layers, Gift, Newspaper, HelpCircle,
  FileText, Folder, Shield, Settings, Search, Bell, LogOut, Lock,
} from 'lucide-react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { api } from '../api';

type Item = { to: string; label: string; Icon: any; perm?: string; countKey?: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  { title: 'Przegląd', items: [{ to: '/statistics', label: 'Statystyki', Icon: BarChart2, perm: 'STATISTICS' }] },
  { title: 'Klienci', items: [
    { to: '/users', label: 'Użytkownicy', Icon: Users, perm: 'USER_DATA', countKey: 'users' },
    { to: '/payments/pay-in', label: 'Płatności', Icon: CreditCard, perm: 'PAYMENT' },
    { to: '/system-partners', label: 'Partnerzy systemowi', Icon: Handshake, perm: 'USER_PARTNERSHIP' },
  ] },
  { title: 'Katalog', items: [
    { to: '/programs', label: 'Programy', Icon: Layers, perm: 'PROGRAM', countKey: 'programs' },
    { to: '/bonuses', label: 'Bonusy', Icon: Gift, perm: 'BONUS', countKey: 'bonuses' },
  ] },
  { title: 'Treści', items: [
    { to: '/news', label: 'Aktualności', Icon: Newspaper, perm: 'NEWS' },
    { to: '/faq', label: 'FAQ', Icon: HelpCircle, perm: 'FAQ' },
    { to: '/regulations', label: 'Regulaminy', Icon: FileText, perm: 'TERMS' },
    { to: '/files', label: 'Pliki', Icon: Folder, perm: 'FILES' },
  ] },
  { title: 'System', items: [
    { to: '/users-cms', label: 'Administratorzy', Icon: Shield, perm: 'USER_DATA', countKey: 'admins' },
    { to: '/parameters', label: 'Parametry', Icon: Settings, perm: 'SETTINGS' },
  ] },
];

export default function Layout() {
  const { admin, logout, can } = useAuth();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => { api.get('/admin/statistics/counts').then(setCounts).catch(() => {}); }, []);
  useEffect(() => { document.querySelector('.content-scroll')?.scrollTo(0, 0); }, [loc.pathname]);

  const name = admin?.name || admin?.email || '';
  const initials = (name.split(/\s+/).map((s: string) => s[0]).join('') || name.slice(0, 2)).slice(0, 2).toUpperCase();
  const role = admin?.superAdmin ? 'Super administrator' : 'Administrator';
  const fmt = (n?: number) => (n == null ? undefined : n.toLocaleString('pl-PL'));

  return (
    <div className="app">
      <aside className="sidebar dk-scroll">
        <div className="sidebar-logo">
          <img src="/logo-divideyou.png" alt="" />
          <span className="word">DivideYou</span>
          <span className="tag">CMS</span>
        </div>
        <nav>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="nav-group">{g.title}</div>
              {g.items.map((it) => {
                const allowed = !it.perm || can(it.perm);
                const active = loc.pathname === it.to || loc.pathname.startsWith(it.to.split('/').slice(0, 2).join('/') + '/');
                if (!allowed) return (
                  <div key={it.to} className="nav-item locked" title="Brak uprawnień">
                    <it.Icon /><span style={{ flex: 1 }}>{it.label}</span><Lock size={14} />
                  </div>
                );
                return (
                  <a key={it.to} className={`nav-item${active ? ' active' : ''}`} onClick={() => nav(it.to)}>
                    <it.Icon /><span style={{ flex: 1 }}>{it.label}</span>
                    {it.countKey && counts[it.countKey] != null && <span className="count dy-num">{fmt(counts[it.countKey])}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-admin">
          <div className="av">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="em">{admin?.email}</div>
            <div className="ro">{role}</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-search">
            <Search size={17} />
            <input placeholder="Szukaj w panelu…" />
          </div>
          <div className="spacer" />
          <div className="theme-toggle">
            <button className={theme === 'petrol' ? 'active' : ''} title="Motyw Petrol" onClick={() => setTheme('petrol')}>
              <span className="sw" style={{ background: '#0E3A33' }} />
            </button>
            <button className={theme === 'midnight' ? 'active' : ''} title="Motyw Midnight" onClick={() => setTheme('midnight')}>
              <span className="sw" style={{ background: '#112A40' }} />
            </button>
          </div>
          <button className="icon-btn" title="Powiadomienia"><Bell size={18} /><span className="dot" /></button>
          <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
          <div className="admin-meta">
            <div className="em">{admin?.email}</div>
            <div className="ro">● {role}</div>
          </div>
          <button className="icon-btn" title="Wyloguj" onClick={logout}><LogOut size={18} /></button>
        </header>
        <div className="content content-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
