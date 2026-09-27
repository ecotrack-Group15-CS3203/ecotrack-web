import { TestUser } from '../support/e2e';

// SRS 3.1.5 claim from the pool, 3.2.1 (<= 3 interactions), and the cross-org claim
// conflict (SAD 11.4): the second organisation to claim is refused.
describe('Incident pool claim', () => {
  let adminA: TestUser;
  let adminB: TestUser;
  let incidentId: string;
  const title = `E2E spill ${Date.now()}`;

  before(() => {
    cy.newUser('admin-a').then((u) => (adminA = u));
    cy.newUser('admin-b').then((u) => (adminB = u));
    cy.newUser('reporter').then((reporter) => {
      cy.createOrg(adminA, `E2E Claim A ${reporter.sub.slice(-6)}`);
      cy.createOrg(adminB, `E2E Claim B ${reporter.sub.slice(-6)}`);
      cy.reportIncident(reporter, title).then((id) => (incidentId = id));
    });
  });

  it('claims a pooled incident in at most 3 interactions (SRS 3.2.1)', () => {
    cy.loginAs(adminA);
    cy.visit('/incident-pool');
    cy.contains('.pool-card', title, { timeout: 15000 }).should('be.visible');

    cy.resetInteractions();
    cy.contains('.pool-card', title).contains('button', 'Claim incident').click();
    cy.get('[role=dialog]').contains('button', 'Claim incident').click();
    cy.contains('.pool-card', title).should('not.exist');
    cy.interactions().then((n) => {
      cy.log(`claim took ${n} interactions`);
      expect(n).to.be.at.most(3);
    });

    // Now owned by organisation A, with a workflow stage (the "claimed" state).
    cy.api(adminA, 'GET', `/incidents/${incidentId}`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.verificationStatus).to.eq('approved');
      expect(res.body.currentStageId).to.be.a('string');
    });
  });

  it("refuses a second organisation's claim on the same incident", () => {
    cy.api(adminB, 'POST', `/incidents/pool/${incidentId}/claim`).then((res) => {
      expect(res.status).to.be.oneOf([404, 409]);
    });
    cy.loginAs(adminB);
    cy.visit('/incident-pool');
    cy.contains('h1, h2', /incident pool/i, { timeout: 15000 });
    cy.contains('.pool-card', title).should('not.exist');
  });
});
