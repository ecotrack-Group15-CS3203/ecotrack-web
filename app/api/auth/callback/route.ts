import { NextResponse, type NextRequest } from 'next/server';
import { exchangeCode, setSessionCookies, STATE_COOKIE } from '@/lib/asgardeo-session';

// Completes the OIDC authorization-code flow: verifies `state` to rule out
// CSRF, exchanges `code` for tokens using the client secret (server-side
// only), writes the tokens into HttpOnly cookies, and lands the user on '/'
// (app/page.tsx routes them to /dashboard or /platform from there).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    const response = NextResponse.redirect(new URL('/login?error=state_mismatch', request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch {
    const response = NextResponse.redirect(new URL('/login?error=exchange_failed', request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete(STATE_COOKIE);
  setSessionCookies(response.cookies, tokens);
  return response;
}
