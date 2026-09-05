import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, STATE_COOKIE, STATE_COOKIE_OPTIONS } from '@/lib/asgardeo-session';

// Kicks off the OIDC authorization-code flow. The `state` cookie is what lets
// the callback route reject a forged/replayed redirect -- don't drop it.
export async function GET() {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildAuthorizeUrl(state));
  response.cookies.set(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
  return response;
}
