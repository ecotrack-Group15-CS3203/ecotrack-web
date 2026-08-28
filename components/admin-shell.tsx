'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from './ui';
import { IconBell, IconLeaf } from './icons';
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
  mode,
  sidebarFoot,
  orgSwitcher,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  mode: 'org' | 'platform';
  sidebarFoot: string;
  orgSwitcher?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const activeItem =
    navItems.find((item) => pathname === item.href) ??
    navItems.find((item) => pathname.startsWith(item.href + '/'));

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className={`web-sidebar ${mode === 'platform' ? 'platform-mode' : ''}`}>
        <div className="web-brand">
          <IconLeaf className="text-white" style={{ stroke: '#fff', width: 20, height: 20 }} />
          EcoTrack
        </div>
        <div className="web-nav">
          {navItems.map((item) => {
            const active = item === activeItem;
            return (
              <Link key={item.href} href={item.href} className={`web-nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    aria-label={`${item.badgeCount} pending`}
                    style={{
                      marginLeft: 'auto',
                      minWidth: 19,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: active ? 'rgba(255,255,255,0.2)' : '#E9B44C',
                      color: active ? '#fff' : '#1E352A',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: '17px',
                      textAlign: 'center',
                    }}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {orgSwitcher}
        <div className="web-sidebar-foot">{sidebarFoot}</div>
      </div>

      <div className="web-shell-main">
        <div className="web-topbar">
          <div className="web-topbar-title">{activeItem?.label ?? ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" aria-label={t('common.notifications')} style={{ color: 'var(--text-2)' }}><IconBell aria-hidden="true" /></button>
            <Avatar name={profile?.fullName ?? '?'} />
            <button
              onClick={handleLogout}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
            >
              {t('common.logOut')}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}
