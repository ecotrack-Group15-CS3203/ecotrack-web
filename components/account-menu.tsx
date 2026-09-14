'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from './ui';
import { IconChevronDown, IconLogout } from './icons';

/**
 * Replaces the public header's "Sign in" link once a session exists. Lives on
 * every public marketing page (landing, get-the-app) inside AuthProvider
 * (root layout), so it can call useAuth() directly -- no prop drilling needed
 * from the server-component pages that render it.
 *
 * (org)/layout.tsx already sends an org_admin's own /dashboard visits and a
 * non-admin's to /app; this menu doesn't duplicate that guard, it just picks
 * the right label for the one link it offers.
 */
export function AccountMenu() {
  const { t } = useTranslation();
  const { profile, loading, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
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

  // Avoids a "Sign in" flash for an already-authenticated visitor: render
  // nothing (same footprint either way, via CSS) until /auth/me resolves.
  if (loading) {
    return <div className="account-menu-placeholder" aria-hidden="true" />;
  }

  if (!profile) {
    return (
      <button type="button" onClick={login} className="btn btn-secondary btn-sm">
        Sign in
      </button>
    );
  }

  const homeHref = profile.role === 'org_admin' && profile.organisation ? '/dashboard' : '/app';
  const homeLabel = homeHref === '/dashboard' ? 'Dashboard' : 'Get the app';

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={profile.fullName} size={28} />
        <span className="account-trigger-name">{profile.fullName.split(' ')[0]}</span>
        <IconChevronDown style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-head">
            <div className="account-dropdown-name">{profile.fullName}</div>
            <div className="account-dropdown-email">{profile.email}</div>
          </div>
          <Link
            href={homeHref}
            className="account-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {homeLabel}
          </Link>
          <button type="button" className="account-dropdown-item" role="menuitem" onClick={logout}>
            <IconLogout style={{ width: 16, height: 16 }} />
            {t('common.logOut')}
          </button>
        </div>
      )}
    </div>
  );
}
