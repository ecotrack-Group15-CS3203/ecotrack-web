import { TestUser } from '../support/e2e';

// SRS 3.1.13 / 3.2.6: an admin creates, renames, reorders and deletes workflow
// stages entirely through the UI.
describe('Workflow stage editor', () => {
  let admin: TestUser;

  before(() => {
    cy.newUser('wf-admin').then((u) => {
      admin = u;
      cy.createOrg(u, `E2E Workflow ${u.sub.slice(-6)}`);
    });
  });

  const rowNames = () =>
    cy
      .get('[role=group][aria-label$=" controls"]')
      .then(($groups) =>
        [...$groups].map((g) => g.getAttribute('aria-label')!.replace(/ controls$/, '')),
      );

  it('creates, renames, reorders and deletes a stage', () => {
    cy.loginAs(admin);
    cy.visit('/workflow');

    cy.contains('button', '+ Add stage', { timeout: 15000 }).click();
    cy.get('#new-stage-name').type('E2E Review');
    cy.get('[role=dialog]').contains('button', 'Add stage').click();
    cy.contains('Stage added.').should('be.visible');

    cy.get('[role=group][aria-label="E2E Review controls"]').contains('Edit').click();
    cy.get('#edit-stage-name').clear().type('E2E Reviewed');
    cy.get('[role=dialog]').contains('button', 'Save changes').click();
    cy.contains('Stage updated.').should('be.visible');

    rowNames().then((before) => {
      const from = before.indexOf('E2E Reviewed');
      expect(from).to.be.greaterThan(0);
      cy.get('[aria-label="Move E2E Reviewed earlier"]').click();
      cy.get('[role=group][aria-label$=" controls"]').should(($g) => {
        const names = [...$g].map((g) => g.getAttribute('aria-label'));
        expect(names.indexOf('E2E Reviewed controls')).to.eq(from - 1);
      });
    });

    cy.get('[aria-label="Delete E2E Reviewed stage"]').click();
    cy.get('[role=dialog]').contains('button', /^Delete$/).click();
    cy.contains('Stage deleted.').should('be.visible');
    cy.get('[aria-label="E2E Reviewed controls"]').should('not.exist');
  });
});
