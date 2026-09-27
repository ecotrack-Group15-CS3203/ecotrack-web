import { TestUser } from '../support/e2e';

// SRS 3.2.5: leaving a required field empty shows an inline message within 200 ms,
// in plain language - no modal, no raw exception text.
//
// Timing uses the page's own clock: a MutationObserver records when the message
// element appears, relative to the blur, so Cypress's command overhead is excluded.
function expectInlineError(input: string, errorId: string, expected: string) {
  cy.get(input).focus();
  cy.window().then((win) => {
    const w = win as Window & { __t0?: number; __t1?: number };
    w.__t1 = undefined;
    const seen = () => win.document.getElementById(errorId)?.textContent?.trim();
    new win.MutationObserver((_, obs) => {
      if (seen()) {
        w.__t1 = win.performance.now();
        obs.disconnect();
      }
    }).observe(win.document.body, { childList: true, subtree: true, characterData: true });
    w.__t0 = win.performance.now();
  });
  cy.get(input).blur();
  cy.get(`#${errorId}`)
    .should('be.visible')
    .invoke('text')
    .then((text) => {
      expect(text.trim()).to.eq(expected);
      expect(text).not.to.match(/error:|exception|undefined|stack|\bat \w+ \(/i);
    });
  cy.window().then((win) => {
    const w = win as Window & { __t0?: number; __t1?: number };
    const ms = (w.__t1 ?? Infinity) - (w.__t0 ?? 0);
    cy.log(`${errorId}: ${ms.toFixed(1)} ms`);
    cy.task('recordMetric', { metric: 'blur_to_error_ms', srs: '3.2.5', field: errorId, value: Number(ms.toFixed(1)), limit: 200 });
    expect(ms).to.be.lessThan(200);
  });
  cy.get('[role=alertdialog]').should('not.exist');
}

describe('Inline validation on blur (SRS 3.2.5)', () => {
  let admin: TestUser;

  before(() => {
    cy.newUser('val-admin').then((u) => {
      admin = u;
      cy.createOrg(u, `E2E Validation ${u.sub.slice(-6)}`);
    });
  });

  it('workflow stage form', () => {
    cy.loginAs(admin);
    cy.visit('/workflow');
    cy.contains('button', '+ Add stage', { timeout: 15000 }).click();
    expectInlineError('#new-stage-name', 'new-stage-error', 'Enter a name for this stage.');
  });

  it('task form', () => {
    cy.loginAs(admin);
    cy.visit('/tasks');
    cy.contains('button', '+ Create task', { timeout: 15000 }).click();
    expectInlineError('#create-task-title', 'create-task-title-error', 'Enter a title for this task.');
    expectInlineError('#create-task-due', 'create-task-due-error', 'A due date is required');
    expectInlineError('#create-task-incident', 'create-task-incident-error', 'Select the incident this task is for.');
  });

  it('organisation registration form', () => {
    cy.newUser('val-founder').then((founder) => {
      cy.loginAs(founder);
      cy.visit('/organisations/new');
      expectInlineError('#org-name', 'org-name-error', 'Enter your organisation name.');
      expectInlineError('#org-contact-email', 'org-contact-email-error', 'Enter a contact email.');
    });
  });
});
