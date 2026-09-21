import { NextResponse, type NextRequest } from 'next/server';
import { buildLogoutUrl, clearSessionCookies, ID_TOKEN_COOKIE, publicUrl } from '@/lib/asgardeo-session';

// Clears the local session cookies AND sends the browser through Asgardeo's
// RP-initiated logout with id_token_hint. Skipping the second half is the bug
// mobile hit: the local session clears but Asgardeo's own SSO cookie
// survives, so the next "sign in" silently re-authenticates the same user
// with no prompt.
export async function GET(request: NextRequest) {
  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value;

  const response = idToken
    ? NextResponse.redirect(buildLogoutUrl(idToken))
    : NextResponse.redirect(publicUrl('/login', request.url));

  clearSessionCookies(response.cookies);
  return response;
}
