import { NextResponse, type NextRequest } from 'next/server';
import {
  buildAuthorizeUrl,
  isSafeReturnPath,
  RETURN_TO_COOKIE,
  STATE_COOKIE,
  STATE_COOKIE_OPTIONS,
} from '@/lib/asgardeo-session';

// Kicks off the OIDC authorization-code flow. The `state` cookie is what lets
// the callback route reject a forged/replayed redirect -- don't drop it.
// An optional `returnTo` carries the page to land on after sign-in (e.g. an
// invite link) back through the round trip to Asgardeo and back.
export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildAuthorizeUrl(state));
  response.cookies.set(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);

  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (returnTo && isSafeReturnPath(returnTo)) {
    response.cookies.set(RETURN_TO_COOKIE, returnTo, STATE_COOKIE_OPTIONS);
  }

  return response;
}
