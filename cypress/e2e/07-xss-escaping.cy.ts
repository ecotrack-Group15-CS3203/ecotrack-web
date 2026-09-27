import { TestUser } from '../support/e2e';

// SRS 3.4.10: user-supplied text is rendered as text. A citizen reports an incident
// whose title is a script tag; the org admin views it in the pool and the incident
// list. The markup must appear literally and never execute.
describe('Stored XSS attempt in an incident title', () => {
  const payload = `<script>alert('xss-${Date.now()}')</script><img src=x onerror="alert('img')">`;
  let admin: TestUser;

  before(() => {
    cy.newUser('xss-admin').then((u) => {
      admin = u;
      cy.createOrg(u, `E2E XSS ${u.sub.slice(-6)}`);
    });
  });

  it('shows the title as plain text in the incident pool and never executes it', () => {
    const alerted = cy.stub().as('alert');
    cy.on('window:alert', alerted);
    cy.newUser('xss-reporter').then((reporter) => cy.reportIncident(reporter, payload));

    cy.loginAs(admin);
    cy.visit('/incident-pool');
    cy.contains('.pool-card', payload, { timeout: 15000 }).should('be.visible');
    cy.get('.pool-card img[src="x"]').should('not.exist');
    cy.get('@alert').should('not.have.been.called');
    cy.contains('.pool-card', payload).scrollIntoView({ offset: { top: -150, left: 0 } });
    cy.screenshot('xss-title-escaped', { capture: 'viewport' });
  });

  it('shows it as plain text in the incident list after claiming', () => {
    const alerted = cy.stub().as('alert');
    cy.on('window:alert', alerted);
    cy.api(admin, 'GET', '/incidents/pool').then((res) => {
      const incident = (res.body as { id: string; title: string }[]).find((i) => i.title === payload)!;
      cy.api(admin, 'POST', `/incidents/pool/${incident.id}/claim`).its('status').should('eq', 200);
    });
    cy.loginAs(admin);
    cy.visit('/incidents');
    cy.contains(payload, { timeout: 15000 }).should('be.visible');
    cy.get('img[src="x"]').should('not.exist');
    cy.get('@alert').should('not.have.been.called');
  });
});
