import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Server-only helpers for the Asgardeo OIDC session: cookie names/options,
 * the authorize/token/logout endpoint URLs, ID-token verification, and the
 * code-exchange / refresh calls against the token endpoint.
 *
 * Nothing here runs in the browser -- every caller is a route handler or
 * proxy.ts, both of which execute on the Node.js runtime.
 */

const BASE_URL = (process.env.ASGARDEO_BASE_URL ?? '').replace(/\/$/, '');
const CLIENT_ID = process.env.ASGARDEO_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.ASGARDEO_CLIENT_SECRET ?? '';
const REDIRECT_URI = process.env.ASGARDEO_REDIRECT_URI ?? '';
const POST_LOGOUT_REDIRECT_URI = process.env.ASGARDEO_POST_LOGOUT_REDIRECT_URI ?? '';

export const ACCESS_TOKEN_COOKIE = 'ecotrack_at';
export const REFRESH_TOKEN_COOKIE = 'ecotrack_rt';
export const ID_TOKEN_COOKIE = 'ecotrack_it';
export const STATE_COOKIE = 'ecotrack_oauth_state';
export const RETURN_TO_COOKIE = 'ecotrack_return_to';

/** Shared flags for every session cookie we set. Lax, not Strict, or the
 * cookie is absent on the redirect back from Asgardeo's authorize endpoint. */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** The state cookie only needs to survive the round trip to Asgardeo and back. */
export const STATE_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 600, // 10 minutes
};

export const AUTHORIZE_ENDPOINT = `${BASE_URL}/oauth2/authorize`;
export const TOKEN_ENDPOINT = `${BASE_URL}/oauth2/token`;
export const JWKS_ENDPOINT = `${BASE_URL}/oauth2/jwks`;
export const LOGOUT_ENDPOINT = `${BASE_URL}/oidc/logout`;
const ISSUER = `${BASE_URL}/oauth2/token`;

// Module-scoped so `jose` caches the fetched key set across requests instead
// of hitting the JWKS endpoint on every verification.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(JWKS_ENDPOINT));
  return jwks;
}

export async function verifyIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: ISSUER,
    audience: CLIENT_ID,
  });
  return payload;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
}

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
}

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Asgardeo token endpoint returned ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  );
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  return url.toString();
}

/** A same-origin relative path only -- anything else (an absolute URL, a
 * protocol-relative `//evil.com`) could turn the post-login redirect into an
 * open redirect. */
export function isSafeReturnPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

export function buildLogoutUrl(idToken: string): string {
  const url = new URL(LOGOUT_ENDPOINT);
  url.searchParams.set('id_token_hint', idToken);
  url.searchParams.set('post_logout_redirect_uri', POST_LOGOUT_REDIRECT_URI);
  return url.toString();
}

/** Minimal shape shared by NextResponse's `.cookies` and the jar returned by
 * `await cookies()` from next/headers -- kept local instead of importing
 * Next's internal cookie types, which aren't part of its public API surface. */
interface CookieJar {
  set(name: string, value: string, options?: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}

export function setSessionCookies(cookies: CookieJar, tokens: TokenResponse): void {
  cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: tokens.expiresIn,
  });
  if (tokens.refreshToken) {
    cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
  }
  if (tokens.idToken) {
    cookies.set(ID_TOKEN_COOKIE, tokens.idToken, COOKIE_OPTIONS);
  }
}

export function clearSessionCookies(cookies: CookieJar): void {
  cookies.delete(ACCESS_TOKEN_COOKIE);
  cookies.delete(REFRESH_TOKEN_COOKIE);
  cookies.delete(ID_TOKEN_COOKIE);
}
