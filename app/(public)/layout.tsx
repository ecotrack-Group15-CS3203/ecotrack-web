import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { Aurora } from '@/components/public/aurora';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import './public.css';

// Loaded here rather than in the root layout, so only public routes download them.
const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

/**
 * The public site: landing, get-the-app, sign-in, invites, org profiles, registration.
 * `.kg` ("kinetic glass") is the root of every public.css rule, which keeps this
 * theme, and its dark mode, away from the org dashboard entirely.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`kg ${display.variable} ${mono.variable}`}>
      <Aurora />
      <PublicHeader />
      <main className="kg-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
