import { COLOMBO, KANDY, TestUser } from '../support/e2e';

// SRS 3.1.11: volunteers request to join; the admin approves or rejects in the
// dashboard; requests from outside the service area are refused.
describe('Volunteer join requests', () => {
  let admin: TestUser;
  let orgId: string;
  let accepted: TestUser;
  let declined: TestUser;

  before(() => {
    cy.newUser('jr-admin').then((u) => (admin = u));
    cy.newUser('jr-accepted').then((u) => (accepted = u));
    cy.newUser('jr-declined').then((u) => (declined = u));
    cy.then(() => cy.createOrg(admin, `E2E Join ${admin.sub.slice(-6)}`)).then((id) => {
      orgId = id;
      for (const u of [accepted, declined]) {
        cy.api(u, 'POST', '/organisations/join-request', { organisationId: id, ...COLOMBO })
          .its('status')
          .should('eq', 201);
      }
    });
  });

  it('approves one request and rejects another from the dashboard', () => {
    cy.loginAs(admin);
    cy.visit('/join-requests');

    cy.get(`[aria-label="Approve ${accepted.name}"]`, { timeout: 15000 }).click();
    cy.contains(`${accepted.name}'s request was approved.`).should('be.visible');

    cy.get(`[aria-label="Reject ${declined.name}"]`).click();
    cy.contains(`${declined.name}'s request was rejected.`).should('be.visible');

    cy.api(accepted, 'GET', '/auth/me').then((res) => {
      expect(res.body.role).to.eq('volunteer');
      expect(res.body.organisation.id).to.eq(orgId);
    });
    cy.api(declined, 'GET', '/auth/me').its('body.organisation').should('not.exist');
  });

  it('refuses a request from outside the service area (geographic eligibility)', () => {
    cy.newUser('jr-far').then((far) => {
      cy.api(far, 'POST', '/organisations/join-request', { organisationId: orgId, ...KANDY }).then(
        (res) => {
          expect(res.status).to.eq(422);
          expect(res.body.message).to.match(/outside .* service area/);
        },
      );
    });
  });
});
