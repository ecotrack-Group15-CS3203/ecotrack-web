import { defineConfig } from 'cypress';

/**
 * E2E suite (SRS 3.5.5 critical paths, 3.2.1/3.2.2 interaction counts, 3.2.5 inline
 * validation). Runs against a local stack, not production:
 *   - mock issuer:  node cypress/mock-issuer.mjs                 (:9998)
 *   - API:          OIDC_JWKS_URI=http://localhost:9998/oauth2/jwks PORT=4100
 *   - web:          ASGARDEO_BASE_URL=http://localhost:9998 ASGARDEO_CLIENT_ID=e2e-client
 *                   API_URL=http://localhost:4100/v1  next start -p 3100
 * See cypress/README.md.
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3100',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    // SRS 3.2.1 fixes the viewport the click-efficiency target is measured at.
    viewportWidth: 1280,
    viewportHeight: 768,
    defaultCommandTimeout: 10000,
    video: true,
    expose: {
      apiUrl: 'http://localhost:4100/v1',
      issuerUrl: 'http://localhost:9998',
    },
  },
});
