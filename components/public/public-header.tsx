import Link from 'next/link';
import { AccountMenu } from '../account-menu';
import { IconLeaf } from '../icons';
import { HeaderCta } from './header-cta';
import { ThemeToggle } from './theme-toggle';

export function BrandMark() {
  return (
    <span className="kg-brand-mark" aria-hidden="true">
      <IconLeaf />
    </span>
  );
}

/** Shared by every public page; section links use `/#…` so they work from any of them. */
export function PublicHeader() {
  return (
    <div className="kg-header-wrap">
      <header className="kg-header">
        <Link href="/" className="kg-brand">
          <BrandMark />
          EcoTrack
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
