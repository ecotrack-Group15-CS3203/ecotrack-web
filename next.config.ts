import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy, following the "Without Nonces" pattern in Next's CSP
 * guide (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * Nonces would force every page to render per request, and the inline theme script
 * in app/layout.tsx must run before hydration, so script-src keeps 'unsafe-inline'.
 * Everything else is locked down: no third-party scripts, no framing, no plugins, no
 * <base> hijacking, forms post only to this origin.
 *
 * Third parties the dashboard really uses:
 * - Mapbox GL: its worker runs from a blob: URL, and it fetches styles, tiles and
 *   telemetry from these hosts (Mapbox's documented CSP requirements).
 * - S3: incident and task photos are presigned GET URLs on the media bucket.
 *   Asgardeo is not listed: sign-in is a full-page redirect to its own domain.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.amazonaws.com${isDev ? " http://localhost:9000" : ""}`,
  "font-src 'self'",
  "connect-src 'self' https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com",
  "worker-src 'self' blob:",
  "child-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Legacy twin of frame-ancestors, for browsers that ignore CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation stays available to this origin: invite acceptance checks the
  // volunteer is inside the organisation's service area.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Cross-Origin-Embedder-Policy is deliberately not set: require-corp would block
  // Mapbox tiles and S3 photos, which do not send Cross-Origin-Resource-Policy.
];

const nextConfig: NextConfig = {
  // Emits .next/standalone: a self-contained server.js plus only the node_modules it
  // needs, which is what the Dockerfile ships.
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
