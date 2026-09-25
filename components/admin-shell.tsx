'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebarCollapsed } from '@/lib/use-sidebar-collapsed';
import { Avatar } from './ui';
import { BrandLogo } from './brand/logo';
import { IconBell, IconChevronDown, IconLogout, IconMenu } from './icons';
import { ThemeToggle } from './theme-toggle';
import { useTranslation } from 'react-i18next';

interface NavItem {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  /** Consecutive items sharing a group are separated from the next group by a divider. */
  group: string;
  badgeCount?: number;
}

/** Keep in sync with the drawer breakpoint in dashboard.css. */
const DRAWER_QUERY = '(max-width: 900px)';

function subscribeDrawer(onChange: () => void) {
  const media = window.matchMedia(DRAWER_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** True when the rail is an off-canvas drawer rather than a collapsible column. */
function useIsDrawer(): boolean {
  return useSyncExternalStore(
    subscribeDrawer,
    () => window.matchMedia(DRAWER_QUERY).matches,
    () => false,
  );
}

function groupItems(items: NavItem[]): { key: string; items: NavItem[] }[] {
  const groups: { key: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.key === item.group) last.items.push(item);
    else groups.push({ key: item.group, items: [item] });
  }
  return groups;
}

/**
 * Console-style shell: a full-width header (menu button, brand, organisation,
 * then theme/notifications/account) over a left rail. On desktop the menu
 * button collapses the rail to icons; at 900px and below the rail becomes an
 * off-canvas drawer and the same button opens it.
 */
export function AdminShell({
  children,
  navItems,
  orgName,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  orgName: string;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);
  const [navPath, setNavPath] = useState(pathname);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const isDrawer = useIsDrawer();

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

  function handleMenu() {
    // Read the breakpoint at click time rather than trusting render state, so a
    // resize between render and click can't toggle the wrong thing.
    if (window.matchMedia(DRAWER_QUERY).matches) setNavOpen((open) => !open);
    else toggleCollapsed();
  }

  const menuExpanded = isDrawer ? navOpen : !collapsed;
  const railCollapsed = !isDrawer && collapsed;

  return (
    <div className="web-shell">
      <header className="web-header">
        <div className="web-header-left">
          <button
            type="button"
            className="web-icon-btn web-nav-toggle"
            aria-label={menuExpanded ? t('common.collapseMenu') : t('common.expandMenu')}
            aria-expanded={menuExpanded}
            aria-controls="web-sidebar"
            onClick={handleMenu}
          >
            <IconMenu aria-hidden="true" />
          </button>
          <Link href="/dashboard" className="web-header-brand" aria-label={t('common.homeLink')}>
            <BrandLogo variant="lockup" size={30} tagline />
          </Link>
          <div className="web-header-org">
            <span className="web-header-org-label">{t('common.organisation')}</span>
            <span className="web-header-org-name" title={orgName}>
              {orgName}
            </span>
          </div>
        </div>
        <div className="web-header-right">
          <ThemeToggle className="web-icon-btn" iconClassName="web-theme-icon" />
          <button type="button" className="web-icon-btn" aria-label={t('common.notifications')}>
            <IconBell aria-hidden="true" />
          </button>
          <UserMenu />
        </div>
      </header>

      <nav
        id="web-sidebar"
        className={`web-sidebar ${navOpen ? 'open' : ''}`}
        aria-label={t('common.menu')}
      >
        <div className="web-sidebar-head">
          <BrandLogo variant="lockup" size={30} />
        </div>
        <div className="web-nav">
          {groupItems(navItems).map((group) => (
            <div key={group.key} className="web-nav-group">
              {group.items.map((item) => {
                const active = item === activeItem;
                const badge = item.badgeCount !== undefined && item.badgeCount > 0 ? item.badgeCount : null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`web-nav-item ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    title={railCollapsed ? item.label : undefined}
                  >
                    <item.icon />
                    <span className="web-nav-label">{item.label}</span>
                    {badge !== null && (
                      <span className="web-nav-badge" aria-label={`${badge} pending`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      {navOpen && <div className="web-nav-scrim" aria-hidden="true" onClick={() => setNavOpen(false)} />}

      <main className="web-main">
        <div className={`web-content ${navOpen ? 'web-content--locked' : ''}`}>{children}</div>
      </main>
    </div>
  );
}

/** Avatar + name in the header; opens a small menu with the account and Log out. */
function UserMenu() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const name = profile?.fullName ?? '?';

  return (
    <div className="web-user" ref={rootRef}>
      <button
        type="button"
        className="web-user-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} size={30} />
        <span className="web-user-name">{name}</span>
        <IconChevronDown className="web-user-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="web-user-menu" role="menu">
          <div className="web-user-head">
            <div className="web-user-head-name">{name}</div>
            {profile?.email && <div className="web-user-head-email">{profile.email}</div>}
          </div>
          {/* logout() itself navigates (to /api/auth/logout, then on through
              Asgardeo's RP-initiated logout) -- no router.replace needed here. */}
          <button type="button" className="web-user-item" role="menuitem" onClick={logout}>
            <IconLogout aria-hidden="true" />
            {t('common.logOut')}
          </button>
        </div>
      )}
    </div>
  );
}
