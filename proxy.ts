import { NextRequest, NextResponse } from "next/server";
import { ID_TOKEN_COOKIE, verifyIdToken } from "@/lib/asgardeo-session";

// This is a UX nicety, not the security boundary: /api/proxy checks the
// session cookie server-side on every call, and NestJS validates the bearer
// token independently. This guard just avoids rendering a signed-out shell
// before redirecting. '/', '/login', '/app' and '/invite/:path*' are
// deliberately unmatched: the landing page never gates on auth, '/app' is the
// landing page's own public "get the app" CTA target (as well as where a
// signed-in non-admin gets redirected, which (org)/layout.tsx handles
// client-side regardless of this matcher), and the invite page needs to
// render its public org-name lookup for signed-out visitors before it asks
// them to sign in.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/incidents/:path*",
    "/incident-pool/:path*",
    "/tasks/:path*",
    "/events/:path*",
    "/volunteers/:path*",
    "/join-requests/:path*",
    "/workflow/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/organisations/new",
  ],
};

export async function proxy(request: NextRequest) {
  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value;
  if (!idToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await verifyIdToken(idToken);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
