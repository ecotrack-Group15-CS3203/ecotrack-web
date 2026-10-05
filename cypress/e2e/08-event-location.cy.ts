import { TestUser } from '../support/e2e';

interface Stage {
  id: string;
  name: string;
  position: number;
  isFinal: boolean;
}

// Issue #55: the Create Event location is picked on a map. Only incidents on the
// org's Event Creation required stage (Workflow Stage Rules, SRS 3.1.21) are
// offered; ticking one auto-places the pin on it, and that location is submitted.
describe('Create event location', () => {
  // Inside the e2e org's 25 km Colombo service area, but away from the form's
  // Colombo default, so the assertion proves the pin actually moved.
  const MORATUWA = { lat: 6.773, lng: 79.8816 };
  const DEHIWALA = { lat: 6.8511, lng: 79.8653 };
  const stamp = Date.now();
  const eligibleTitle = `E2E event spill ${stamp}`;
  const otherStageTitle = `E2E wrong-stage spill ${stamp}`;
  let admin: TestUser;
  let orgId: string;

  before(() => {
    cy.newUser('event-admin').then((u) => {
      admin = u;
      cy.createOrg(u, `E2E Events ${u.sub.slice(-6)}`).then((id) => (orgId = id));
    });
    cy.newUser('event-reporter').then((reporter) => {
      cy.reportIncident(reporter, eligibleTitle, MORATUWA).as('eligibleId');
      cy.reportIncident(reporter, otherStageTitle, DEHIWALA).as('otherId');
    });
    cy.then(function () {
      for (const id of [this.eligibleId, this.otherId]) {
        cy.api(admin, 'POST', `/incidents/pool/${id}/claim`).its('status').should('be.oneOf', [200, 201]);
      }
      // Require a later, non-final stage than the one claiming lands on, and move only
      // the first incident there; the second stays behind and must not be offered.
      cy.api(admin, 'GET', `/incidents/${this.eligibleId}`).then((incident) => {
        cy.api(admin, 'GET', `/organisations/${orgId}/workflow-stages`).then((res) => {
          const stages = (res.body as Stage[]).slice().sort((a, b) => a.position - b.position);
          const landing = stages.find((s) => s.id === incident.body.currentStageId)!;
          const required = stages.find((s) => !s.isFinal && s.position > landing.position);
          if (!required) throw new Error('The default workflow should have a non-final stage after the claim stage');
          cy.api(admin, 'PATCH', `/organisations/${orgId}/incidents/${this.eligibleId}/stage`, { stageId: required.id })
            .its('status')
            .should('eq', 200);
          cy.api(admin, 'PATCH', `/organisations/${orgId}/workflow-stage-rules`, { eventCreationMinStageId: required.id })
            .its('status')
            .should('be.oneOf', [200, 201]);
        });
      });
    });
  });

  it('offers only incidents on the required stage, and submits the ticked incident\'s location', () => {
    cy.loginAs(admin);
    cy.intercept('POST', '**/events').as('createEvent');
    cy.visit('/events');
    cy.contains('button', '+ Create event', { timeout: 15000 }).click();

    cy.get('[role=dialog]').within(() => {
      cy.contains('label', eligibleTitle, { timeout: 15000 }).should('be.visible');
      cy.contains('label', otherStageTitle).should('not.exist');

      cy.contains('label', eligibleTitle).find('input[type=checkbox]').check();
      cy.get('.loc-picker-coords').should('contain', '6.77300, 79.88160');

      cy.get('#create-event-title').type('E2E lake cleanup');
      cy.get('#create-event-description').type('Picking up litter around the reported spill.');
      cy.get('#create-event-start').type('2030-01-10T09:00');
      cy.get('#create-event-end').type('2030-01-10T12:00');
      cy.contains('button', /^Create event$/).click();
    });

    cy.wait('@createEvent').its('request.body.location').should('deep.eq', MORATUWA);
  });
});
