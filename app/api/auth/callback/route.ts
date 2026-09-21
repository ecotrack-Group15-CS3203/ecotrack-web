import { NextResponse, type NextRequest } from 'next/server';
import {
  exchangeCode,
  publicUrl,
  isSafeReturnPath,
  RETURN_TO_COOKIE,
  setSessionCookies,
  STATE_COOKIE,
} from '@/lib/asgardeo-session';

// Completes the OIDC authorization-code flow: verifies `state` to rule out
// CSRF, exchanges `code` for tokens using the client secret (server-side
// only), writes the tokens into HttpOnly cookies, and lands the user back on
// whatever page sent them to sign in (an invite link, org registration) via
// the `returnTo` cookie set by /api/auth/login. Defaults to '/dashboard', not
// '/' -- the landing page is a static public page that never redirects on
// its own, so a plain sign-in (not via a specific returnTo) needs to land
// somewhere that actually resolves the user's role: (org)/layout.tsx sends a
// non-admin on to /app immediately.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    const response = NextResponse.redirect(publicUrl('/login?error=state_mismatch', request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch {
    const response = NextResponse.redirect(publicUrl('/login?error=exchange_failed', request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value;
  const destination = returnTo && isSafeReturnPath(returnTo) ? returnTo : '/dashboard';

  const response = NextResponse.redirect(publicUrl(destination, request.url));
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(RETURN_TO_COOKIE);
  setSessionCookies(response.cookies, tokens);
  return response;
}
