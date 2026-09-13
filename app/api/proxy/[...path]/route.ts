import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  COOKIE_OPTIONS,
  clearSessionCookies,
  refreshTokens,
  type TokenResponse,
} from '@/lib/asgardeo-session';

// Same-origin BFF proxy: the browser calls this route with its HttpOnly
// session cookie attached automatically (same origin), we attach the real
// Authorization header server-side and forward to NestJS. The access token
// never enters JavaScript. See ASGARDEO_WEB_MIGRATION_PLAN.md section 3.
const API_URL = (process.env.API_URL ?? 'http://localhost:4000/v1').replace(/\/$/, '');

// Headers that must not be copied verbatim from the upstream response onto
// the one we build here -- they describe the upstream transport, not ours,
// and forwarding them stale/mismatched breaks the client's parsing of the body.
const UNSAFE_RESPONSE_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

// Single-flight refresh: concurrent proxied requests that all hit a 401 at
// once (e.g. several SWR hooks firing together) share one refresh call
// instead of each racing Asgardeo's token endpoint. Mirrors the pattern in
// ecotrack-mobile/src/services/apiClient.ts.
//
// Keyed by the refresh token's own value, not a single module-global slot --
// this route handler runs once per server process, shared across every
// concurrently signed-in user. A single shared `let refreshPromise` would let
// user B's request, hitting a 401 in the same window as user A's, await user
// A's in-flight refresh and then retry ITS OWN request using user A's newly
// refreshed access token -- a real cross-user token leak, not just a race
// condition. Keying by the token value scopes the single-flight de-dup to
// "this one refresh token", which is unique per user, so two different
// users' concurrent refreshes never share an entry.
const refreshPromises = new Map<string, Promise<TokenResponse | null>>();

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    return await refreshTokens(refreshToken);
  } catch {
    return null;
  }
}

function getOrStartRefresh(refreshToken: string): Promise<TokenResponse | null> {
  let promise = refreshPromises.get(refreshToken);
  if (!promise) {
    promise = refreshAccessToken(refreshToken).finally(() => {
      refreshPromises.delete(refreshToken);
    });
    refreshPromises.set(refreshToken, promise);
  }
  return promise;
}

async function forwardOnce(
  request: NextRequest,
  path: string[],
  accessToken: string | undefined,
  body: Blob | undefined,
) {
  const url = `${API_URL}/${path.join('/')}${request.nextUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  // Forwarded verbatim, boundary and all -- this is what lets multipart
  // FormData uploads (evidence attachments) pass through unaltered.
  if (contentType) headers.set('content-type', contentType);
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  return fetch(url, { method: request.method, headers, body });
}

async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // Buffered up front rather than passed through as `request.body`: a
  // ReadableStream can only be read once, but a 401 may need this same body
  // resent on the post-refresh retry below. Bodyless methods get `undefined`.
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.blob() : undefined;

  let upstream: Response;
  try {
    upstream = await forwardOnce(request, path, accessToken, body);
  } catch {
    // NestJS is unreachable (down, wrong API_URL, network blip) -- surface a
    // clean JSON error the client's apiFetch can parse instead of letting
    // fetch's TypeError bubble up as Next's generic 500 page.
    return NextResponse.json({ message: 'The API is unreachable.' }, { status: 502 });
  }
  let refreshed: TokenResponse | null = null;
  // Captured only for a 401 we decide NOT to retry -- upstream.body is a stream
  // that can only be read once, so reading it here to inspect `code` means we
  // must reuse this text for the final response instead of streaming
  // upstream.body again below (which retrying replaces with a fresh, unread one).
  let unauthorizedBodyText: string | null = null;

  if (upstream.status === 401) {
    unauthorizedBodyText = await upstream.text();
    // JwtAuthGuard (ecotrack-api) always shapes a 401 as {statusCode, code,
    // message} with code one of TOKEN_EXPIRED/TOKEN_MISSING/TOKEN_INVALID --
    // only the first is worth a refresh attempt. Retrying on TOKEN_MISSING
    // (no token was ever sent) or TOKEN_INVALID (a malformed/corrupt token)
    // can't be fixed by minting a new access token from the same refresh
    // token, so there's no reason to spend a round trip to Asgardeo on it.
    let code: string | undefined;
    try {
      code = (JSON.parse(unauthorizedBodyText) as { code?: string }).code;
    } catch {
      // Not JSON (e.g. NestJS's default 401 page) -- leave code undefined,
      // which the check below already treats as "don't retry".
    }

    if (code === 'TOKEN_EXPIRED') {
      const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
      if (refreshToken) {
        refreshed = await getOrStartRefresh(refreshToken);
        if (refreshed) {
          upstream = await forwardOnce(request, path, refreshed.accessToken, body);
          unauthorizedBodyText = null;
        }
      }
    }
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!UNSAFE_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  // unauthorizedBodyText is non-null exactly when upstream.body was already
  // consumed above and never replaced by a retry -- reuse that text instead
  // of streaming the now-empty upstream.body.
  const response = new NextResponse(unauthorizedBodyText ?? upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });

  if (refreshed) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: refreshed.expiresIn,
    });
    if (refreshed.refreshToken) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, COOKIE_OPTIONS);
    }
    // proxy.ts's page-level guard verifies the ID token's own `exp`, so a
    // refresh that doesn't also renew this cookie would leave that guard
    // bouncing signed-in users to /login on a stale ID token even though
    // their API access just renewed successfully.
    if (refreshed.idToken) {
      response.cookies.set(ID_TOKEN_COOKIE, refreshed.idToken, COOKIE_OPTIONS);
    }
  } else if (upstream.status === 401) {
    // The refresh attempt failed (or there was no refresh token to try) --
    // the session is dead, so drop the cookies rather than leaving stale
    // ones for the client to keep retrying with.
    clearSessionCookies(response.cookies);
  }

  return response;
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

async function handler(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { path } = await params;
  return forward(request, path);
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
