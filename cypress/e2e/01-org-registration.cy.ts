import { TestUser } from '../support/e2e';

// SRS 3.1.14: a signed-in user with no organisation registers one in the dashboard.
describe('Organisation registration', () => {
  it('registers an organisation and lands on its dashboard as org admin', () => {
    cy.newUser('founder').then((founder: TestUser) => {
      const name = `E2E Org ${founder.sub.slice(-6)}`;
      cy.loginAs(founder);
      cy.visit('/organisations/new');
      cy.get('#org-name').type(name);
      cy.get('#org-contact-email').type(`contact-${founder.sub}@e2e.test`);
      cy.contains('button', 'Register organisation').click();

      cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');
      cy.api(founder, 'GET', '/auth/me').then((res) => {
        expect(res.body.role).to.eq('org_admin');
        expect(res.body.organisation.name).to.eq(name);
      });
    });
  });
});
