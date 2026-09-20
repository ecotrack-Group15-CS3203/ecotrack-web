'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from './ui';
import { IconBell, IconLeaf, IconMenu } from './icons';
import { ThemeToggle } from './theme-toggle';
import { useTranslation } from 'react-i18next';

interface NavItem {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  badgeCount?: number;
}

export function AdminShell({
  children,
  navItems,
  sidebarFoot,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarFoot: string;
}) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);
  const [navPath, setNavPath] = useState(pathname);

  const activeItem =
    navItems.find((item) => pathname === item.href) ??
    navItems.find((item) => pathname.startsWith(item.href + '/'));

  // Close the mobile drawer whenever the route changes. Adjusting during render
  // rather than in an effect (React's "adjusting state when props change")
  // avoids a cascading re-render, and keying off pathname rather than each
  // Link's onClick also covers back/forward navigation.
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  function handleLogout() {
    // logout() itself navigates (to /api/auth/logout, then on through
    // Asgardeo's RP-initiated logout) -- no router.replace needed here.
    logout();
  }

  return (
    <div className="web-shell">
      <div id="web-sidebar" className={`web-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="web-brand">
          <IconLeaf style={{ width: 20, height: 20 }} />
          EcoTrack
        </div>
        <div className="web-nav">
          {navItems.map((item) => {
            const active = item === activeItem;
            return (
              <Link key={item.href} href={item.href} className={`web-nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                <item.icon />
                {item.label}
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="web-nav-badge" aria-label={`${item.badgeCount} pending`}>
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <div className="web-sidebar-foot">{sidebarFoot}</div>
      </div>

      {navOpen && <div className="web-nav-scrim" aria-hidden="true" onClick={() => setNavOpen(false)} />}

      <div className="web-shell-main">
        <div className="web-topbar">
          <div className="web-topbar-left">
            <button
              type="button"
              className="web-icon-btn web-nav-toggle"
              aria-label={t('common.menu')}
              aria-expanded={navOpen}
              aria-controls="web-sidebar"
              onClick={() => setNavOpen((open) => !open)}
            >
              <IconMenu aria-hidden="true" />
            </button>
            <div className="web-topbar-title">{activeItem?.label ?? ''}</div>
          </div>
          <div className="web-topbar-right">
            <ThemeToggle className="web-icon-btn" iconClassName="web-theme-icon" />
            <button type="button" className="web-icon-btn" aria-label={t('common.notifications')}>
              <IconBell aria-hidden="true" />
            </button>
            <Avatar name={profile?.fullName ?? '?'} />
            <button type="button" className="web-logout" onClick={handleLogout}>
              {t('common.logOut')}
            </button>
          </div>
        </div>
        <div className={`web-content ${navOpen ? 'web-content--locked' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
