'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from './ui';
import { IconBell, IconLeaf } from './icons';

interface NavItem {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
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
              <Link key={item.href} href={item.href} className={`web-nav-item ${active ? 'active' : ''}`}>
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </div>
        {orgSwitcher}
        <div className="web-sidebar-foot">{sidebarFoot}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="web-topbar">
          <div className="web-topbar-title">{activeItem?.label ?? ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <IconBell style={{ color: 'var(--text-2)' }} />
            <Avatar name={profile?.fullName ?? '?'} />
            <button
              onClick={handleLogout}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
            >
              Log out
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}
