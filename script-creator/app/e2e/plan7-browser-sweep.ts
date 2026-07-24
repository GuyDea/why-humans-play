import type { Locator, Page } from 'playwright';
import {
  runBrowserSweep,
  runLearningLifecycleSweep,
  selectEditorParagraph,
  waitForCount,
  waitForEditorSave,
  waitForMinimumCount,
  waitForText,
} from './browser-sweep-harness.js';

async function selectWinningPackage(page: Page): Promise<void> {
  const winnerRow = page.locator(
    '[data-testid="shortlist-row"]',
  ).filter({ hasText: 'The Queue Game' });
  await winnerRow.getByRole(
    'button',
    { name: 'Test packages' },
  ).click();
  const packageDirections = page.locator(
    '[data-testid="package-test-direction"]',
  );
  await waitForMinimumCount(packageDirections, 1);
  await packageDirections.first().getByRole(
    'button',
    { name: 'Use this package' },
  ).click();
  await waitForText(packageDirections.first(), 'Selected package');
}

async function rejectOverbroadArchitecture(
  architecturePanel: Locator,
): Promise<void> {
  const finalLesson = architecturePanel.locator(
    '[data-section-key="final-lesson"]',
  );
  await finalLesson.getByLabel('Refine Final lesson').fill(
    'Make this lesson falsely universal so it can be rejected.',
  );
  await finalLesson.getByRole(
    'button',
    { name: 'Refine section' },
  ).click();
  const rejectedProposal = finalLesson.locator(
    '[data-testid="architecture-proposal"]',
  );
  await waitForText(rejectedProposal, 'Fake rewrite for final-lesson.');
  await rejectedProposal.locator(
    'input[aria-label^="Why reject"]',
  ).fill('Too universal for the evidence.');
  await rejectedProposal.getByRole(
    'button',
    { name: 'Reject proposal' },
  ).click();
  await waitForCount(rejectedProposal, 0);
}

async function exerciseNarrationChoices(context: {
  page: Page;
  editorHost: Locator;
  editor: Locator;
}): Promise<void> {
  const { page, editorHost, editor } = context;
  const toolbar = editorHost.getByRole(
    'toolbar',
    { name: 'Selected text actions' },
  );

  await selectEditorParagraph(page, editor, 0);
  await toolbar.getByRole('button', { name: 'Rewrite' }).click();
  const rejectedRewrite = editorHost.locator('.proposal-diff');
  await waitForText(rejectedRewrite, 'Rewritten passage.');
  page.once('dialog', (dialog) => {
    void dialog.accept('The rewrite hides the visible choice.');
  });
  await rejectedRewrite.getByRole(
    'button',
    { name: 'Reject' },
  ).click();
  await waitForCount(rejectedRewrite, 0);

  await selectEditorParagraph(page, editor, 0);
  await toolbar.getByRole('button', { name: 'Rewrite' }).click();
  const rerolledRewrite = editorHost.locator('.proposal-diff');
  await waitForText(rerolledRewrite, 'Rewritten passage.');
  page.once('dialog', (dialog) => {
    void dialog.accept('The first rewrite was too generic.');
  });
  await rerolledRewrite.getByRole(
    'button',
    { name: 'Re-roll' },
  ).click();
  await waitForText(rerolledRewrite, 'Rewritten passage.');
  await rerolledRewrite.getByRole(
    'button',
    { name: 'Accept' },
  ).click();
  await waitForCount(rerolledRewrite, 0);
  await waitForEditorSave(page);

  await selectEditorParagraph(page, editor, 1);
  await toolbar.getByRole('button', { name: 'Alternatives' }).click();
  const variant = page.locator('[data-testid="unsettled-variant"]');
  await variant.waitFor();
  await variant.getByRole(
    'button',
    { name: 'Pick active' },
  ).click();
  await waitForCount(variant, 0);
  await waitForEditorSave(page);
}

async function runPlan7BrowserSweep(): Promise<void> {
  await runBrowserSweep(7, {
    afterTopicSelection: selectWinningPackage,
    afterArchitectureReview: rejectOverbroadArchitecture,
    afterEpisodeAccepted: exerciseNarrationChoices,
    runLearningSweep: runLearningLifecycleSweep,
  });
}

void runPlan7BrowserSweep();
