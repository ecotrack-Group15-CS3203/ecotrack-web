# E2E tests (Cypress)

Critical dashboard paths from SRS 3.5.5, plus the measurable usability targets
(3.2.1 claim in <= 3 interactions, 3.2.2 task in <= 5, 3.2.5 inline validation
<= 200 ms). Measured values are written to `cypress/results/metrics.jsonl`.

Runs against a local stack with a mock identity provider instead of Asgardeo:

```bash
# 1. Mock issuer (JWKS + token minting) on :9998
node cypress/mock-issuer.mjs
# 2. API (ecotrack-api, after docker compose up + pnpm db:migrate + pnpm build)
PORT=4100 OIDC_JWKS_URI=http://localhost:9998/oauth2/jwks \
  OIDC_ISSUER=http://localhost:9998/oauth2/token node dist/main.js
# 3. Dashboard (after next build)
PORT=3100 API_URL=http://localhost:4100/v1 ASGARDEO_BASE_URL=http://localhost:9998 \
  ASGARDEO_CLIENT_ID=e2e-client ASGARDEO_CLIENT_SECRET=unused \
  ASGARDEO_REDIRECT_URI=http://localhost:3100/api/auth/callback \
  ASGARDEO_POST_LOGOUT_REDIRECT_URI=http://localhost:3100 next start -p 3100
# 4. Tests (VS Code terminals set ELECTRON_RUN_AS_NODE, which breaks Cypress)
env -u ELECTRON_RUN_AS_NODE pnpm exec cypress run --browser chrome
```

Sign-in: tests mint a token from the mock issuer and set the `ecotrack_it` /
`ecotrack_at` cookies the dashboard reads. Test data is created through the API as
real users, so each spec gets a fresh organisation.
