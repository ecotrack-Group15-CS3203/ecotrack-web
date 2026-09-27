// Stand-in for Asgardeo during E2E runs: publishes a JWKS and mints signed tokens.
//
// The web dashboard trusts `ecotrack_it` if it verifies against
// ${ASGARDEO_BASE_URL}/oauth2/jwks with iss=${BASE}/oauth2/token and aud=CLIENT_ID
// (proxy.ts), and forwards `ecotrack_at` to the API as the bearer. The API verifies
// against OIDC_JWKS_URI. Pointing both at this server lets a test sign in as any
// user by setting the two cookies - no hosted login page, no cross-origin flow.
//
//   node cypress/mock-issuer.mjs           # listens on :9998 (MOCK_ISSUER_PORT)
//   GET /oauth2/jwks                       # public key set
//   GET /token?sub=...&email=...&name=...  # RS256 JWT, 1 h lifetime
import { createServer } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const port = Number(process.env.MOCK_ISSUER_PORT ?? 9998);
const base = `http://localhost:${port}`;
const issuer = `${base}/oauth2/token`;
const audience = process.env.MOCK_ISSUER_AUDIENCE ?? 'e2e-client';
const kid = 'e2e-key';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', base);
  if (url.pathname === '/oauth2/jwks') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  if (url.pathname === '/token') {
    const sub = url.searchParams.get('sub');
    if (!sub) {
      res.writeHead(400).end('sub is required');
      return;
    }
    // The API rejects tokens that live longer than one hour (SRS 3.4.6).
    const token = await new SignJWT({
      email: url.searchParams.get('email') ?? `${sub}@e2e.test`,
      name: url.searchParams.get('name') ?? sub,
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setSubject(sub)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('55m')
      .sign(privateKey);
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(token);
    return;
  }
  // The dashboard's logout redirects here; answer rather than 404.
  if (url.pathname === '/oidc/logout') {
    res.writeHead(200).end('logged out');
    return;
  }
  res.writeHead(404).end();
}).listen(port, () => console.log(`mock issuer on ${base} (iss ${issuer}, aud ${audience})`));
