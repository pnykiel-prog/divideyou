import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Newspaper, LayoutGrid, Wallet as WalletIcon, Layers, Gift, Users, HelpCircle, Settings as Gear,
  Search, Copy, LogOut, Clock, ArrowRight, Menu,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api, jr } from '../api';
import { useTheme } from '../theme';
import { useToast } from '../ui';

const NAV = [
  { to: '/news', label: 'Aktualności', Icon: Newspaper },
  { to: '/profile', label: 'Pulpit', Icon: LayoutGrid },
  { to: '/wallet', label: 'Portfel', Icon: WalletIcon },
  { to: '/programs', label: 'Programy', Icon: Layers },
  { to: '/bonuses', label: 'Bonusy', Icon: Gift },
  { to: '/partnership', label: 'Partnerstwo', Icon: Users, badge: 'PARTNER' },
  { to: '/faq', label: 'Pomoc / FAQ', Icon: HelpCircle },
  { to: '/settings', label: 'Ustawienia', Icon: Gear },
];

const CRUMB: Record<string, string> = {
  news: 'Aktualności', profile: 'Pulpit', wallet: 'Portfel', programs: 'Programy',
  'vip-programs': 'Programy VIP', program: 'Program', location: 'Lokalizacja',
  bonuses: 'Bonusy', bonus: 'Bonus', partnership: 'Partnerstwo', faq: 'Pomoc / FAQ', settings: 'Ustawienia',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [active, setActive] = useState(0);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    api.get('/wallet').then((w) => setActive(w.active)).catch(() => {});
  }, [loc.pathname]);

  useEffect(() => {
    document.querySelector('.content')?.scrollTo(0, 0);
    setDrawer(false); // close mobile drawer on navigation
  }, [loc.pathname]);

  const ThemeToggle = ({ className = '' }: { className?: string }) => (
    <div className={`theme-toggle ${className}`}>
      <button className={theme === 'petrol' ? 'active' : ''} title="Motyw Petrol" onClick={() => setTheme('petrol')}>
        <span className="sw" style={{ background: '#0E3A33' }} />
      </button>
      <button className={theme === 'midnight' ? 'active' : ''} title="Motyw Midnight" onClick={() => setTheme('midnight')}>
        <span className="sw" style={{ background: '#112A40' }} />
      </button>
    </div>
  );

  const name = user?.companyName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const initials = (user?.companyName
    ? user.companyName.slice(0, 2)
    : ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')) || (user?.email || '?').slice(0, 2)
  ).toUpperCase();
  const isPartner = !!user?.partnerNumber;
  const role = `${isPartner ? 'Partner' : 'Klient'} · ${user?.accessFeePaid ? 'pełny dostęp' : 'demo'}`;
  const myId = user?.partnerNumber || (user?.clientId || '').slice(0, 10).toUpperCase();
  const refLink = `${window.location.origin}/register/${user?.partnerNumber || user?.clientId || ''}`;

  const section = loc.pathname.split('/')[1] || 'news';
  const crumbLast = CRUMB[section] || 'Aktualności';

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast(label);
  };
  const doLogout = () => { logout(); nav('/login'); };

  return (
    <div className="app">
      <div className={`sidebar-backdrop${drawer ? ' show' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`sidebar dy-scroll${drawer ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo-divideyou.png" alt="DivideYou" />
          <span>DivideYou</span>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, Icon, badge }) => {
            const on = loc.pathname === to || loc.pathname.startsWith(to + '/');
            return (
              <a key={to} className={`nav-item${on ? ' active' : ''}`} onClick={() => nav(to)}>
                <Icon size={20} strokeWidth={1.8} />
                <span className="grow">{label}</span>
                {badge && isPartner && <span className="badge badge-partner">{badge}</span>}
              </a>
            );
          })}
        </nav>
        <div className="myid-card">
          <div className="myid-inner">
            <div className="myid-label">MÓJ ID</div>
            <div className="row" style={{ marginBottom: 12 }}>
              <code className="dy-num grow" style={{ fontFamily: "'Newsreader',serif", fontSize: 16, fontWeight: 600 }}>{myId}</code>
              <button className="icon-btn" title="Kopiuj ID" style={{ width: 30, height: 30, borderColor: 'var(--brand-300)', color: 'var(--brand-600)' }} onClick={() => copy(myId, 'Skopiowano ID')}>
                <Copy size={15} />
              </button>
            </div>
            <button className="btn btn-primary btn-block btn-sm" onClick={() => copy(refLink, 'Skopiowano link polecający')}>
              <Copy size={15} /> Kopiuj link polecający
            </button>
          </div>
        </div>
        <ThemeToggle className="sidebar-theme" />
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" title="Menu" onClick={() => setDrawer(true)}><Menu size={18} /></button>
          <div className="input-icon grow topbar-search" style={{ maxWidth: 380 }}>
            <Search size={18} />
            <input className="input" style={{ height: 40 }} placeholder="Szukaj programów, lokalizacji…"
              onKeyDown={(e) => { if (e.key === 'Enter') nav('/programs'); }} />
          </div>
          <div className="grow" />
          <ThemeToggle />
          <div className="saldo-cap">
            <div style={{ textAlign: 'right' }}>
              <div className="lab">SALDO AKTYWNE</div>
              <div className="val dy-num">{jr(active)}</div>
            </div>
            <button title="Portfel" onClick={() => nav('/wallet')}><WalletIcon size={17} /></button>
          </div>
          <div className="topbar-divider" style={{ width: 1, height: 30, background: 'var(--line)' }} />
          <div className="row" style={{ gap: 10 }}>
            <div className="user-text" style={{ textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{role}</div>
            </div>
            <div className="avatar">{initials}</div>
            <button className="icon-btn" title="Wyloguj" onClick={doLogout}><LogOut size={17} /></button>
          </div>
        </header>

        <main className="content dy-scroll">
          <div className="content-inner">
            <div className="breadcrumbs">
              <a onClick={() => nav('/news')}>DivideYou</a>
              <span className="sep">/</span>
              <span className="last">{crumbLast}</span>
            </div>
            {!user?.accessFeePaid && (
              <div className="banner warn">
                <span className="banner-ic"><Clock size={20} /></span>
                <div className="grow">
                  <div className="banner-title">Dostęp demo — konto w wersji próbnej</div>
                  <div className="banner-text">Wykup pełny dostęp, aby kupować programy i bonusy oraz doładowywać portfel.</div>
                </div>
                <button className="btn btn-sm" style={{ background: '#9A6A0C', color: '#fff' }} onClick={() => nav('/wallet')}>
                  Wykup dostęp <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div className="section-fade">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
