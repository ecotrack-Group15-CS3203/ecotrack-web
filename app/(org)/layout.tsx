import { Space_Grotesk } from 'next/font/google';
import { OrgGuard } from './org-guard';
import './dashboard.css';

// Same weights and subset as app/(public)/layout.tsx, so the two loaders resolve
// to the same hashed font files and moving between the public site and the
// dashboard is a cache hit rather than a second download.
const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

/**
 * The org admin dashboard. `.eco` is the root of every dashboard.css rule, which
 * keeps this theme, and its dark mode, away from the public pages entirely --
 * mirroring how `.kg` scopes the public theme.
 */
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`eco ${display.variable}`}>
      <OrgGuard>{children}</OrgGuard>
    </div>
  );
}
