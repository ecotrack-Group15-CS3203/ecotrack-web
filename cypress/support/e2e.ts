/// <reference types="cypress" />

/**
 * Shared commands. Every test signs in by minting a token from the mock issuer and
 * setting the two session cookies the dashboard reads (see cypress/mock-issuer.mjs),
 * and seeds its own data through the real API as real users - so each spec starts
 * from a fresh organisation with the default workflow stages the API creates.
 */

export interface TestUser {
  sub: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** A new, never-seen user; the API provisions it on first request. */
      newUser(label: string): Chainable<TestUser>;
      loginAs(user: TestUser): Chainable<void>;
      /** Calls the API as `user`. Never fails on status: assert it yourself. */
      api(
        user: TestUser,
        method: string,
        path: string,
        body?: unknown,
      ): Chainable<Cypress.Response<any>>;
      /** Registers an organisation as `user`, who becomes its org admin. */
      createOrg(user: TestUser, name: string): Chainable<string>;
      /** Reports an incident as `user` (a citizen) near Colombo by default. */
      reportIncident(
        user: TestUser,
        title: string,
        at?: { lat: number; lng: number },
      ): Chainable<string>;
      /** Interaction counting for SRS 3.2.1/3.2.2: clicks, selects and typed fields. */
      resetInteractions(): Chainable<void>;
      interactions(): Chainable<number>;
    }
  }
}

export const COLOMBO = { lat: 6.9271, lng: 79.8612 };
/** ~95 km from Colombo: outside every service area these tests create. */
export const KANDY = { lat: 7.2906, lng: 80.6337 };

const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

Cypress.Commands.add('newUser', (label: string) => {
  const sub = `e2e-${runId}-${label}-${Math.random().toString(36).slice(2, 7)}`;
  return cy.wrap({ sub, email: `${sub}@e2e.test`, name: `E2E ${label} ${runId}` });
});

function token(user: TestUser) {
  const q = new URLSearchParams({ sub: user.sub, email: user.email, name: user.name });
  return cy
    .request(`${Cypress.expose('issuerUrl')}/token?${q}`)
    .its('body') as Cypress.Chainable<string>;
}

Cypress.Commands.add('loginAs', (user: TestUser) => {
  token(user).then((jwt) => {
    cy.setCookie('ecotrack_it', jwt);
    cy.setCookie('ecotrack_at', jwt);
  });
});

Cypress.Commands.add('api', (user, method, path, body) =>
  token(user).then((jwt) =>
    cy.request({
      method,
      url: `${Cypress.expose('apiUrl')}${path}`,
      headers: { Authorization: `Bearer ${jwt}` },
      body,
      failOnStatusCode: false,
    }),
  ),
);

Cypress.Commands.add('createOrg', (user, name) =>
  cy
    .api(user, 'POST', '/organisations', {
      name,
      contactEmail: `contact-${user.sub}@e2e.test`,
      serviceAreaCenter: COLOMBO,
      serviceAreaRadiusKm: 25,
    })
    .then((res) => {
      expect(res.status, JSON.stringify(res.body)).to.eq(201);
      return (res.body.organisation?.id ?? res.body.id) as string;
    }),
);

Cypress.Commands.add('reportIncident', (user, title, at = COLOMBO) =>
  cy
    .api(user, 'POST', '/incidents', {
      title,
      urgency: 'high',
      category: 'illegal_dumping',
      location: at,
      mediaUrls: ['http://localhost:9000/ecotrack-media/e2e-placeholder.jpg'],
    })
    .then((res) => {
      expect(res.status, JSON.stringify(res.body)).to.eq(201);
      return res.body.id as string;
    }),
);

let interactionCount = 0;
Cypress.Commands.add('resetInteractions', () => {
  interactionCount = 0;
});
Cypress.Commands.add('interactions', () => cy.wrap(interactionCount));
Cypress.Commands.overwrite('click', (originalFn, ...args) => {
  interactionCount += 1;
  return originalFn(...args);
});
Cypress.Commands.overwrite('select', (originalFn, ...args) => {
  interactionCount += 1;
  return originalFn(...args);
});
// Typing a whole value into one field is one interaction, however many keys.
Cypress.Commands.overwrite('type', (originalFn, ...args) => {
  interactionCount += 1;
  return originalFn(...args);
});

// Known, non-fatal: React hydration mismatch (#418), recovered by client rendering
// and logged in the report's defect log. Only this one is tolerated - any other
// uncaught application error still fails the test.
Cypress.on('uncaught:exception', (err) => {
  if (/Minified React error #418/.test(err.message)) return false;
  return undefined;
});
