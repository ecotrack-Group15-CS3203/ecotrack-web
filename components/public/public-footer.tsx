import Link from 'next/link';
import { BrandMark } from './public-header';

export function PublicFooter() {
  return (
    <footer className="kg-footer">
      <div className="kg-container kg-footer-inner">
        <Link href="/" className="kg-brand kg-brand--small">
          <BrandMark />
          EcoTrack
        </Link>
        <nav className="kg-footer-links" aria-label="Footer">
          <Link href="/#for-organisations">For organisations</Link>
          <Link href="/#for-citizens">For citizens</Link>
          <Link href="/app">Get the app</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <small>© {new Date().getFullYear()} EcoTrack</small>
      </div>
    </footer>
  );
}
