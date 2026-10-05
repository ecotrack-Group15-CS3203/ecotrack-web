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

  // Issue #54: the service area is set with a map picker; the manual-coordinate fallback
  // and the radius chips must still reach the API unchanged.
  it('submits manually entered coordinates and the chosen radius', () => {
    cy.newUser('founder').then((founder: TestUser) => {
      cy.loginAs(founder);
      cy.intercept('POST', '**/organisations').as('createOrg');
      cy.visit('/organisations/new');
      cy.get('#org-name').type(`E2E Picker Org ${founder.sub.slice(-6)}`);
      cy.get('#org-contact-email').type(`picker-${founder.sub}@e2e.test`);

      // Without a Mapbox token the manual section starts open; with one it starts collapsed.
      cy.get('details.loc-picker-manual').then(($details) => {
        if (!$details.prop('open')) cy.wrap($details).find('summary').click();
      });
      cy.get('.loc-picker-manual input').eq(0).clear().type('6.7801');
      cy.get('.loc-picker-manual input').eq(1).clear().type('79.9056');
      cy.contains('[role="radio"]', '10 km').click().should('have.attr', 'aria-checked', 'true');
      cy.contains('button', 'Register organisation').click();

      cy.wait('@createOrg').its('request.body').should((body) => {
        expect(body.serviceAreaCenter).to.deep.eq({ lat: 6.7801, lng: 79.9056 });
        expect(body.serviceAreaRadiusKm).to.eq(10);
      });
      cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');
    });
  });
});
