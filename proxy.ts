import { NextRequest, NextResponse } from "next/server";
import { ID_TOKEN_COOKIE, verifyIdToken } from "@/lib/asgardeo-session";

// This is a UX nicety, not the security boundary: /api/proxy checks the
// session cookie server-side on every call, and NestJS validates the bearer
// token independently. This guard just avoids rendering a signed-out shell
// before redirecting. /login and /accept-invite are deliberately unmatched --
// accept-invite still runs its own (currently broken) pre-Asgardeo flow.
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
    "/organisations/:path*",
    "/platform/:path*",
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
