import Link from 'next/link';
import { AccountMenu } from '../account-menu';
import { BrandLogo } from '../brand/logo';
import { HeaderCta } from './header-cta';
import { ThemeToggle } from '../theme-toggle';

/** The hexagon mark alone, for spots that already show the name in text. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return <BrandLogo variant="mark" size={size} className={className} />;
}

/** Shared by every public page; section links use `/#…` so they work from any of them. */
export function PublicHeader() {
  return (
    <div className="kg-header-wrap">
      <header className="kg-header">
        <Link href="/" className="kg-brand" aria-label="EcoTrack home">
          <BrandLogo variant="lockup" size={36} tagline />
        </Link>
        <nav className="kg-nav" aria-label="Primary">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#for-organisations">For organisations</Link>
          <Link href="/#for-citizens">For citizens</Link>
        </nav>
        <div className="kg-header-actions">
          <ThemeToggle />
          <AccountMenu />
          <div className="kg-header-cta">
            <HeaderCta />
          </div>
        </div>
      </header>
    </div>
  );
}
