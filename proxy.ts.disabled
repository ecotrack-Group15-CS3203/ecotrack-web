import { NextRequest, NextResponse } from "next/server";
import { ID_TOKEN_COOKIE, verifyIdToken } from "@/lib/asgardeo-session";

// Scoped to /dashboard-oidc rather than the live /dashboard route, which is
// still guarded by the existing localStorage-token auth-context. Repoint this
// matcher at /dashboard once the app migrates fully to Asgardeo sessions.
export const config = {
  matcher: ["/dashboard-oidc/:path*"],
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
