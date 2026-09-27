import { COLOMBO, TestUser } from '../support/e2e';

// SRS 3.1.6 incident-to-task conversion and 3.2.2 (<= 5 interactions from
// "Create task" to the task showing as assigned).
describe('Create and assign a cleanup task', () => {
  let admin: TestUser;
  let volunteer: TestUser;
  let orgId: string;
  let incidentId: string;
  const incidentTitle = `E2E task source ${Date.now()}`;

  before(() => {
    cy.newUser('task-admin').then((u) => (admin = u));
    cy.newUser('task-volunteer').then((u) => (volunteer = u));
    cy.newUser('task-reporter').then((reporter) => {
      cy.createOrg(admin, `E2E Tasks ${reporter.sub.slice(-6)}`).then((id) => {
        orgId = id;
        // Volunteer joins through the real join-request flow.
        cy.api(volunteer, 'POST', '/organisations/join-request', {
          organisationId: orgId,
          ...COLOMBO,
        }).then((req) => {
          expect(req.status, JSON.stringify(req.body)).to.eq(201);
          cy.api(admin, 'PATCH', `/organisations/${orgId}/join-requests/${req.body.id}`, {
            status: 'approved',
          })
            .its('status')
            .should('eq', 200);
        });
      });
      cy.reportIncident(reporter, incidentTitle).then((id) => {
        incidentId = id;
        cy.api(admin, 'POST', `/incidents/pool/${id}/claim`).its('status').should('eq', 200);
      });
    });
  });

  it('creates and assigns a task from the incident in at most 5 interactions (SRS 3.2.2)', () => {
    const taskTitle = `E2E cleanup ${Date.now()}`;
    cy.loginAs(admin);
    cy.visit(`/incidents/${incidentId}`);
    cy.contains('button', '+ Create task', { timeout: 15000 }).should('be.visible');

    cy.resetInteractions();
    cy.contains('button', '+ Create task').click();
    cy.get('#create-task-title').type(taskTitle);
    cy.get('#create-task-volunteer').select(volunteer.name);
    cy.get('#create-task-due').type('2026-12-31T10:00');
    cy.get('[role=dialog]').contains('button', 'Create task').click();

    cy.location('pathname', { timeout: 15000 }).should('match', /^\/tasks\/[0-9a-f-]{36}$/);
    cy.contains(taskTitle).should('be.visible');
    cy.contains(volunteer.name).should('be.visible');
    cy.interactions().then((n) => {
      cy.log(`task creation took ${n} interactions`);
      expect(n).to.be.at.most(5);
    });

    cy.location('pathname').then((path) => {
      cy.api(admin, 'GET', `/organisations/${orgId}${path}`).then((res) => {
        expect(res.status).to.eq(200);
        const assignees = (res.body.assignments ?? []).map(
          (a: { volunteerUserId: string; status: string }) => a.status,
        );
        expect(assignees).to.include('assigned');
      });
    });
  });
});
