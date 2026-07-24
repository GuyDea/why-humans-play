import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  closeSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  chromium,
  type Browser,
  type Locator,
  type Page,
} from 'playwright';

interface RuntimeHandshake {
  port: number;
  nonce: string;
  pid: number;
}

interface RunningDaemon {
  child: ChildProcess;
  handshake: RuntimeHandshake;
  runtimeFile: string;
  stdout: () => string;
  stderr: () => string;
}

interface DraftRecord {
  id: string;
  episodeSlug: string;
  doc: {
    metadata?: {
      creativeStatus?: {
        phase?: string;
      };
    };
  };
}

interface MilestoneStatus {
  workspace: null | {
    branch: string;
    worktreePath: string;
  };
}

interface LearningDecision {
  id: string;
  kind: string;
  note: string | null;
}

interface DistillationRun {
  id: string;
  state: string;
  operationId: string | null;
  sessionId: string;
  decisions: Array<{ decisionId: string; snapshot: unknown }>;
}

interface LessonRecord {
  id: string;
  classification: 'episode-local' | 'durable';
  state: string;
  proposedMarkdown: string | null;
  reviewedMarkdown: string | null;
  version: number;
  evidence: Array<{
    id: string;
    status: 'resolved' | 'stale';
  }>;
  reconciliation: null | {
    kind: 'apply' | 'retire' | 'supersede';
    state: 'prepared' | 'awaiting-reconciliation' | 'verified';
    resumeKey: string;
    preparedMarkdown: string;
  };
  repositoryProvenance: null | {
    status: 'resolved' | 'unresolved';
  };
}

interface OperationRecord {
  id: string;
  operation: string;
  state: string;
  inputs: unknown;
  operationLessons: Array<{
    lessonId: string;
    lessonVersion: number;
    contentHash: string;
  }>;
}

const APP_DIR = resolve(__dirname, '..');
const SOURCE_REPO = resolve(APP_DIR, '../..');
const POLL_MS = 50;
const UI_TIMEOUT_MS = 30_000;
const PLAN7_SWEEP = process.env['PLAN7_SWEEP'] === '1';

let browser: Browser | null = null;
let daemon: RunningDaemon | null = null;
let temporaryRoot: string | null = null;

async function main(): Promise<void> {
  const sourceHead = gitOutput(SOURCE_REPO, ['rev-parse', 'HEAD']);
  const sourceStatus = gitRawOutput(SOURCE_REPO, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  const sourceBranch = gitOutput(SOURCE_REPO, [
    'branch',
    '--show-current',
  ]);
  assert(sourceBranch !== '', 'source checkout must be on a branch');

  temporaryRoot = mkdtempSync(join(
    tmpdir(),
    PLAN7_SWEEP ? 'whp-plan7-browser-' : 'whp-plan6-browser-',
  ));
  const cloneRoot = join(temporaryRoot, 'repo');
  const xdgDataHome = join(temporaryRoot, 'xdg-data');
  const xdgStateHome = join(temporaryRoot, 'xdg-state');
  const isolatedHome = join(temporaryRoot, 'home');

  run('git', [
    'clone',
    '--quiet',
    '--no-local',
    '--branch',
    sourceBranch,
    SOURCE_REPO,
    cloneRoot,
  ]);
  applyTrackedWorktreeChanges(SOURCE_REPO, cloneRoot, sourceStatus);
  if (
    runOptional('git', [
      '-C',
      cloneRoot,
      'show-ref',
      '--verify',
      '--quiet',
      'refs/remotes/origin/main',
    ])
  ) {
    run('git', [
      '-C',
      cloneRoot,
      'remote',
      'set-head',
      'origin',
      'main',
    ]);
  }
  run('git', [
    '-C',
    cloneRoot,
    'config',
    'user.name',
    PLAN7_SWEEP ? 'Plan 7 Sweep' : 'Plan 6 Sweep',
  ]);
  run('git', [
    '-C',
    cloneRoot,
    'config',
    'user.email',
    PLAN7_SWEEP
      ? 'plan7-sweep@example.invalid'
      : 'plan6-sweep@example.invalid',
  ]);

  copyNodeModules('script-creator/editor-core', cloneRoot);
  copyNodeModules('script-creator/server', cloneRoot);
  copyNodeModules('script-creator/app', cloneRoot);

  const cloneApp = join(cloneRoot, 'script-creator', 'app');
  const cloneServer = join(cloneRoot, 'script-creator', 'server');
  const fakeCodex = join(cloneServer, 'test', 'fake-codex.mjs');
  assert(
    existsSync(fakeCodex),
    'temporary clone is missing the fake Codex executable',
  );
  assertSymlinkFreeSkills(cloneRoot);

  run('npm', ['run', 'build'], cloneApp, 5 * 60_000);

  const repoId = createHash('sha256')
    .update(resolve(cloneRoot))
    .digest('hex')
    .slice(0, 12);
  const runtimeFile = join(
    xdgStateHome,
    'whp-script-creator',
    repoId,
    'daemon.json',
  );
  const daemonEnvironment = {
    HOME: isolatedHome,
    XDG_DATA_HOME: xdgDataHome,
    XDG_STATE_HOME: xdgStateHome,
    SC_CODEX_BIN: fakeCodex,
  };

  daemon = await startDaemon(
    cloneServer,
    runtimeFile,
    daemonEnvironment,
    'full-topic-run',
  );
  const seededRunId = await seedCompletedTopicRun(daemon.handshake);
  await stopDaemon(daemon);
  daemon = null;

  daemon = await startDaemon(
    cloneServer,
    runtimeFile,
    daemonEnvironment,
    PLAN7_SWEEP ? 'plan7-flow' : 'plan6-flow',
  );

  const baseUrl = `http://127.0.0.1:${daemon.handshake.port}`;
  const initialCommitCount = Number(
    gitOutput(cloneRoot, ['rev-list', '--count', '--all']),
  );
  assert(
    Number.isInteger(initialCommitCount) && initialCommitCount > 0,
    'temporary clone has no baseline commit history',
  );
  const assertNoCommit = (stage: string) => {
    const count = Number(
      gitOutput(cloneRoot, ['rev-list', '--count', '--all']),
    );
    assert(
      count === initialCommitCount,
      `an unexpected commit appeared before explicit commit (${stage})`,
    );
  };
  let plan7ReconcileCommit: string | null = null;

  browser = await launchChromium();
  const page = await browser.newPage();
  page.setDefaultTimeout(UI_TIMEOUT_MS);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(
    `${baseUrl}/#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.getByRole('link', { name: 'Topics', exact: true }).click();
  await selectTopicRun(page, seededRunId);

  if (PLAN7_SWEEP) {
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

  await page.getByRole('button', { name: 'Preview handoff' }).click();
  const handoffPreview = page.locator('[data-testid="handoff-preview"]');
  await handoffPreview.waitFor();
  await handoffPreview.getByRole(
    'button',
    { name: 'Confirm handoff' },
  ).click();
  await waitForText(
    page.locator('[data-testid="handoff-conflict"]'),
    'workspace choice required',
  );

  const drafts = await api<DraftRecord[]>(
    daemon.handshake,
    '/api/drafts',
  );
  const draft = drafts.find(
    (candidate) => candidate.episodeSlug === 'the-queue-game',
  );
  assert(draft, 'topic handoff did not create the expected draft');

  await page.goto(
    `${baseUrl}/?draft=${encodeURIComponent(draft.id)}`,
    { waitUntil: 'domcontentloaded' },
  );
  const milestonePanel = page.locator('app-milestone-panel');
  await milestonePanel.waitFor();
  await waitForText(milestonePanel, 'Recommended new branch');
  await milestonePanel.getByRole(
    'button',
    { name: 'Use recommended branch' },
  ).click();
  await waitForText(milestonePanel, 'episode/the-queue-game');

  const workspaceStatus = await waitForValue(
    async () => api<MilestoneStatus>(
      daemon!.handshake,
      `/api/drafts/${encodeURIComponent(draft.id)}/milestones/status`,
    ),
    (status) => status.workspace !== null,
    UI_TIMEOUT_MS,
    'recommended episode workspace was not recorded',
  );
  const workspace = workspaceStatus.workspace;
  assert(workspace, 'recommended episode workspace is absent');

  await page.goto(`${baseUrl}/topics`, { waitUntil: 'domcontentloaded' });
  await selectTopicRun(page, seededRunId);
  const inProgress = page.locator('[data-testid="handoff-in-progress"]');
  await inProgress.waitFor();
  await inProgress.getByRole('button', { name: 'Resume handoff' }).click();
  await page.waitForURL((url) =>
    url.pathname === '/'
    && url.searchParams.get('draft') === draft.id);
  await page.locator('app-architecture-panel').waitFor();

  const topicPath = join(
    workspace.worktreePath,
    'whp-youtube',
    'topics',
    'the-queue-game.md',
  );
  const pipelinePath = join(
    workspace.worktreePath,
    'whp-youtube',
    'PIPELINE.md',
  );
  assertFileContains(topicPath, 'OK');
  assertFileContains(pipelinePath, 'the-queue-game');
  assertFileContains(pipelinePath, 'architecture');
  assertNoCommit('topic handoff');

  const architecturePanel = page.locator('app-architecture-panel');
  await architecturePanel.getByRole(
    'button',
    { name: 'Generate architecture' },
  ).click();
  const proposals = architecturePanel.locator(
    '[data-testid="architecture-proposal"]',
  );
  await waitForCount(proposals, 14);
  for (let remaining = 14; remaining > 0; remaining -= 1) {
    await proposals.first().getByRole(
      'button',
      { name: 'Accept proposal' },
    ).click();
    await waitForCount(proposals, remaining - 1);
  }

  await architecturePanel.getByRole(
    'button',
    { name: 'Review architecture' },
  ).click();
  const coreAnswer = architecturePanel.locator(
    '[data-section-key="core-answer"]',
  );
  await waitForText(coreAnswer, 'Fake finding_markdown.');

  await coreAnswer.getByLabel('Refine Core answer').fill(
    'Make the causal step explicit.',
  );
  await coreAnswer.getByRole(
    'button',
    { name: 'Refine section' },
  ).click();
  await waitForText(coreAnswer, 'Fake rewrite for core-answer.');
  await coreAnswer.getByRole(
    'button',
    { name: 'Accept proposal' },
  ).click();
  await waitForText(coreAnswer, 'Fake rewrite for core-answer.');
  await waitForCount(
    coreAnswer.locator('[data-testid="architecture-proposal"]'),
    0,
  );

  if (PLAN7_SWEEP) {
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

  const architecturePath = join(
    workspace.worktreePath,
    'whp-youtube',
    'architectures',
    'the-queue-game.md',
  );
  mkdirSync(dirname(architecturePath), { recursive: true });
  writeFileSync(
    architecturePath,
    'pre-planted architecture approval conflict\n',
  );
  await architecturePanel.getByRole(
    'button',
    { name: 'Approve architecture' },
  ).click();
  await waitForAttribute(
    architecturePanel.locator('[data-testid="architecture-ribbon"]'),
    'data-state',
    'paused',
  );
  await waitForText(
    architecturePanel,
    'Approval paused — resume required',
  );
  await assertArchitectureEditingDisabled(architecturePanel, coreAnswer);
  const editorHost = page.locator('app-editor-host');
  const editor = page.locator('[data-testid="editor"] .ProseMirror');
  await editor.waitFor();
  await waitForText(
    editorHost,
    'Architecture action paused — resume or resolve first.',
  );
  await waitForAttribute(editor, 'contenteditable', 'false');
  const pausedNarration = await editor.textContent();
  const revisionsBeforeBlockedEdit = await api<unknown[]>(
    daemon!.handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/revisions`,
  );
  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' This edit must stay blocked.');
  assert(
    await editor.textContent() === pausedNarration,
    'paused approval allowed a narration editor mutation',
  );
  const pausedRevisions = await api<unknown[]>(
    daemon!.handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/revisions`,
  );
  assert(
    pausedRevisions.length === revisionsBeforeBlockedEdit.length,
    'paused editor attempt appended a narration revision',
  );
  assert(
    await architecturePanel.getByRole(
      'button',
      { name: 'Reopen architecture' },
    ).count() === 0,
    'paused approval presented Reopen instead of Resume',
  );

  unlinkSync(architecturePath);
  await architecturePanel.getByRole(
    'button',
    { name: 'Resume approval' },
  ).click();
  await waitForAttribute(
    architecturePanel.locator('[data-testid="architecture-ribbon"]'),
    'data-state',
    'approved',
  );
  await waitForAttribute(editor, 'contenteditable', 'true');
  await waitForCount(
    editorHost.locator('[data-testid="editor-blocked-callout"]'),
    0,
  );
  await assertArchitectureEditingDisabled(architecturePanel, coreAnswer);
  const narrationActions = page.locator('app-narration-actions');
  await waitForEnabled(narrationActions.getByRole(
    'button',
    { name: 'Generate episode' },
  ));
  assertFileContains(architecturePath, 'Fake rewrite for core-answer.');
  assertFileContains(pipelinePath, 'prototyping');
  assertNoCommit('architecture approval');

  const acceptEpisodeProposal = async (): Promise<void> => {
    await narrationActions.getByRole(
      'button',
      { name: 'Generate episode' },
    ).click();
    const episodeProposal = narrationActions.locator(
      '[data-testid="episode-generation-proposal"]',
    );
    await waitForText(
      episodeProposal,
      'A queue quietly turns waiting into a strategic game.',
    );
    await episodeProposal.getByRole(
      'button',
      { name: 'Accept episode proposal' },
    ).click();
    await waitForCount(episodeProposal, 0);
  };
  await acceptEpisodeProposal();
  await waitForText(
    editor,
    'A queue quietly turns waiting into a strategic game.',
  );
  await waitForEditorSave(page);

  if (PLAN7_SWEEP) {
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

  let reopenDialogMessage = '';
  page.once('dialog', (dialog) => {
    reopenDialogMessage = dialog.message();
    void dialog.accept();
  });
  await architecturePanel.getByRole(
    'button',
    { name: 'Reopen architecture' },
  ).click();
  assert(
    reopenDialogMessage.includes('narration is preserved'),
    'reopen confirmation did not describe narration preservation',
  );
  await waitForAttribute(
    architecturePanel.locator('[data-testid="architecture-ribbon"]'),
    'data-state',
    'reopened',
  );
  await waitForText(
    narrationActions,
    'Narration reconciliation is required before Promote.',
  );
  await waitForText(
    editor,
    'Choosing a line is a bet made with incomplete information.',
  );

  await architecturePanel.getByRole(
    'button',
    { name: 'Approve architecture' },
  ).click();
  await waitForText(
    narrationActions,
    'Generate Episode can replace narration from the approved architecture',
  );
  await waitForAttribute(
    architecturePanel.locator('[data-testid="architecture-ribbon"]'),
    'data-state',
    'reopened',
  );
  let reconciliationDialogMessage = '';
  page.once('dialog', (dialog) => {
    reconciliationDialogMessage = dialog.message();
    void dialog.accept();
  });
  const markReconciled = narrationActions.getByRole(
    'button',
    { name: 'Mark narration reconciled' },
  );
  await waitForEnabled(markReconciled);
  await markReconciled.click();
  assert(
    reconciliationDialogMessage.includes('current revision'),
    'narration reconciliation confirmation did not identify the current revision',
  );
  await waitForAttribute(
    architecturePanel.locator('[data-testid="architecture-ribbon"]'),
    'data-state',
    'approved',
  );
  await waitForText(
    narrationActions,
    'Approve complete narration before Promote.',
  );
  await editor.locator('p').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' A queue turns waiting into a game.');
  await waitForEditorSave(page);

  const productionPanel = page.locator('app-production-panel');
  {
    const ledger = await api<unknown>(
      daemon!.handshake,
      `/api/drafts/${encodeURIComponent(draft.id)}/narration/proposals`,
    );
    console.log('DIAG pre-approval ledger:', JSON.stringify(ledger));
    for (const row of (ledger as { proposals: { operationId: string }[] }).proposals) {
      const op = await api<{ operation: string; state: string }>(
        daemon!.handshake,
        `/api/ops/${encodeURIComponent(row.operationId)}`,
      );
      console.log('DIAG pending op:', row.operationId, op.operation, op.state);
    }
  }
  const approveNarration = productionPanel.getByRole(
    'button',
    { name: 'Approve complete narration' },
  );
  await waitForEnabled(approveNarration);
  await approveNarration.click();
  await waitForValue(
    async () => api<DraftRecord>(
      daemon!.handshake,
      `/api/drafts/${encodeURIComponent(draft.id)}`,
    ),
    (current) =>
      current.doc.metadata?.creativeStatus?.phase === 'creative-approved',
    UI_TIMEOUT_MS,
    'complete narration approval did not advance the creative phase',
  );
  assertNoCommit('complete narration approval');

  await productionPanel.getByLabel('Production target').fill(
    'whp-youtube/episodes/01-the-queue-game.md',
  );
  const promote = productionPanel.getByRole(
    'button',
    { name: 'Promote to Phase 2' },
  );
  await waitForEnabled(promote);
  await promote.click();
  await waitForText(productionPanel, 'validation-required');
  const productionCards = productionPanel.locator(
    '[data-testid="production-card"]',
  );
  await waitForMinimumCount(productionCards, 3);
  await waitForText(productionPanel, 'Script metadata');

  await productionPanel.getByLabel('Response for PI-001').fill(
    'I noticed the choice while waiting with a friend.',
  );
  await productionPanel.getByRole(
    'button',
    { name: 'Integrate supplied response' },
  ).click();
  const piProposal = productionPanel.locator(
    '[data-testid="pi-proposal"]',
  );
  await waitForText(piProposal, 'Rewritten passage.');
  await piProposal.getByRole(
    'button',
    { name: 'Accept proposal' },
  ).click();
  await waitForCount(piProposal, 0);
  await waitForText(editor, 'Rewritten passage.');
  await waitForEditorSave(page);

  await productionPanel.getByRole(
    'button',
    { name: 'Run validator' },
  ).click();
  await waitForAttribute(
    productionPanel.locator('[data-validator-status]'),
    'data-validator-status',
    'fail',
  );
  await waitForText(
    productionPanel,
    'Word count metadata 80 does not match',
  );

  const selectedReplacement = await editor.evaluate(
    (root, needle) => {
      const document = root.ownerDocument;
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
      );
      for (
        let current = walker.nextNode();
        current;
        current = walker.nextNode()
      ) {
        const text = current.textContent ?? '';
        const offset = text.indexOf(needle);
        if (offset < 0) continue;
        const range = document.createRange();
        range.setStart(current, offset);
        range.setEnd(current, offset + needle.length);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        (root as HTMLElement).focus();
        return true;
      }
      return false;
    },
    'Rewritten passage.',
  );
  assert(
    selectedReplacement,
    'accepted personal-input replacement was not selectable in the editor',
  );
  await page.keyboard.press('Backspace');
  await waitForMissingText(editor, 'Rewritten passage.');
  await waitForEditorSave(page);

  await productionPanel.getByRole(
    'button',
    { name: 'Re-run validator' },
  ).click();
  await waitForAttribute(
    productionPanel.locator('[data-validator-status]'),
    'data-validator-status',
    'pass',
  );
  if (PLAN7_SWEEP) {
    plan7ReconcileCommit = await runPlan7LearningSweep({
      page,
      cloneRoot,
      cloneServer,
      runtimeFile,
      daemonEnvironment,
      draft,
      workspace,
      initialCommitCount,
    });
  }
  const completePromote = productionPanel.getByRole(
    'button',
    { name: 'Complete Promote' },
  );
  await waitForEnabled(completePromote);
  await completePromote.click();
  await waitForText(
    productionPanel.locator('.promote-workflow > header'),
    'complete',
  );
  assertFileContains(pipelinePath, 'production');
  if (PLAN7_SWEEP) {
    assertCommitCount(
      cloneRoot,
      initialCommitCount + 1,
      'promotion completion after external reconciliation',
    );
  } else {
    assertNoCommit('promotion completion');
  }

  await milestonePanel.getByRole(
    'button',
    { name: 'Refresh milestones' },
  ).click();
  const productionMilestone = milestonePanel
    .locator('[data-milestone-id]')
    .filter({ hasText: 'production-promotion' });
  await productionMilestone.waitFor();
  if (PLAN7_SWEEP) {
    assertCommitCount(
      cloneRoot,
      initialCommitCount + 1,
      'pending production milestone',
    );
  } else {
    assertNoCommit('pending production milestone');

    await productionMilestone.locator('input[type="checkbox"]').check();
    const explicitCommit = productionMilestone.getByRole(
      'button',
      { name: 'Commit milestone' },
    );
    await waitForEnabled(explicitCommit);
    await explicitCommit.click();
    await productionMilestone.waitFor({ state: 'detached' });
  }

  const finalCommitCount = Number(
    gitOutput(cloneRoot, ['rev-list', '--count', '--all']),
  );
  assert(
    finalCommitCount === initialCommitCount + 1,
    PLAN7_SWEEP
      ? 'external reconciliation did not create exactly one commit'
      : 'explicit milestone action did not create exactly one commit',
  );
  const commitMessage = gitOutput(workspace.worktreePath, [
    'log',
    '-1',
    '--pretty=%s',
  ]);
  assert(
    commitMessage === (PLAN7_SWEEP
      ? 'docs(whp): simulate reviewed lesson reconciliation'
      : 'feat(the-queue-game): record production promotion milestone'),
    `unexpected milestone commit message: ${commitMessage}`,
  );
  if (PLAN7_SWEEP) {
    assert(
      plan7ReconcileCommit === gitOutput(workspace.worktreePath, [
        'rev-parse',
        'HEAD',
      ]),
      'verified reconciliation commit is not the workspace HEAD',
    );
  }
  assert(
    pageErrors.length === 0,
    `browser page errors: ${pageErrors.join(' | ')}`,
  );
  assert(
    gitOutput(SOURCE_REPO, ['rev-parse', 'HEAD']) === sourceHead,
    'developer checkout HEAD changed during the sweep',
  );
  assert(
    gitRawOutput(SOURCE_REPO, [
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ]) === sourceStatus,
    'developer checkout files changed during the sweep',
  );
}

async function runPlan7LearningSweep(options: {
  page: Page;
  cloneRoot: string;
  cloneServer: string;
  runtimeFile: string;
  daemonEnvironment: Record<string, string>;
  draft: DraftRecord;
  workspace: NonNullable<MilestoneStatus['workspace']>;
  initialCommitCount: number;
}): Promise<string> {
  const {
    page,
    cloneRoot,
    cloneServer,
    runtimeFile,
    daemonEnvironment,
    draft,
    workspace,
    initialCommitCount,
  } = options;
  assert(daemon, 'Plan 7 learning sweep requires a running daemon');

  const decisionPage = await api<{ decisions: LearningDecision[] }>(
    daemon.handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/decisions?limit=100`,
  );
  const kinds = new Set(decisionPage.decisions.map(({ kind }) => kind));
  for (const expected of [
    'proposal-accepted',
    'proposal-rejected',
    'proposal-rerolled',
    'variant-picked',
    'gate-action',
    'package-picked',
    'winner-handed-off',
    'personal-input-integrated',
    'validator-fix-cycle-accepted',
  ]) {
    assert(kinds.has(expected), `captured decisions omitted ${expected}`);
  }
  assert(
    decisionPage.decisions.some((decision) =>
      decision.kind === 'proposal-rejected'
      && decision.note === 'Too universal for the evidence.'),
    'architecture rejection reason was not captured',
  );
  assert(
    decisionPage.decisions.some((decision) =>
      decision.kind === 'proposal-rerolled'
      && decision.note === 'The first rewrite was too generic.'),
    'proposal re-roll reason was not captured',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount,
    'captured decisions',
  );
  assertDoctrineClean(workspace.worktreePath, 'captured decisions');

  await page.route(
    '**/api/distillations/*/reconcile',
    (route) => route.abort('blockedbyclient'),
  );
  await page.goto(
    `http://127.0.0.1:${daemon.handshake.port}/lessons`,
    { waitUntil: 'domcontentloaded' },
  );
  const lessonsPage = page.locator('[data-testid="lessons-page"]');
  await lessonsPage.waitFor();
  await lessonsPage.getByRole(
    'button',
    { name: 'End session & distill' },
  ).click();
  await waitForText(
    lessonsPage.locator('[data-testid="distillation-state"]'),
    'Distillation queued',
  );

  const distillOperation = await waitForValue(
    async () => {
      const response = await api<{
        operations: Array<{
          id: string;
          operation: string;
          state: string;
        }>;
      }>(daemon!.handshake, '/api/ops');
      return response.operations.find(
        ({ operation }) => operation === 'distill',
      ) ?? null;
    },
    (operation): operation is {
      id: string;
      operation: string;
      state: string;
    } => operation !== null,
    UI_TIMEOUT_MS,
    'Distill operation was not durably listed',
  );
  assert(distillOperation, 'Distill operation lookup returned null');
  const runId = (
    await lessonsPage.locator('.distill-console dl code')
      .first()
      .textContent()
  )?.trim() ?? '';
  assert(runId !== '', 'Distill run ID was not rendered');
  await waitForValue(
    () => api<OperationRecord>(
      daemon!.handshake,
      `/api/ops/${encodeURIComponent(distillOperation.id)}`,
    ),
    (operation) => operation.state === 'completed',
    UI_TIMEOUT_MS,
    'Distill operation did not complete before restart',
  );
  const beforeRestart = await api<DistillationRun>(
    daemon.handshake,
    `/api/distillations/${encodeURIComponent(runId)}`,
  );
  assert(
    beforeRestart.state !== 'ingested',
    'blocked Distill polling ingested before the recovery restart',
  );
  assert(
    beforeRestart.decisions.length === decisionPage.decisions.length,
    'Distill did not freeze the complete decision window',
  );

  await stopDaemon(daemon);
  daemon = null;
  await page.unroute('**/api/distillations/*/reconcile');
  daemon = await startDaemon(
    cloneServer,
    runtimeFile,
    daemonEnvironment,
    'plan7-flow',
  );
  const recoveredRun = await waitForValue(
    () => api<DistillationRun>(
      daemon!.handshake,
      `/api/distillations/${encodeURIComponent(runId)}`,
    ),
    (run) => run.state === 'ingested',
    UI_TIMEOUT_MS,
    'restart did not ingest the completed frozen Distill result',
  );
  assert(
    recoveredRun.id === beforeRestart.id
      && recoveredRun.sessionId === beforeRestart.sessionId
      && recoveredRun.operationId === beforeRestart.operationId,
    'Distill recovery changed persisted run identity',
  );

  let baseUrl = `http://127.0.0.1:${daemon.handshake.port}`;
  await page.goto(
    `${baseUrl}/lessons#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.locator('[data-testid="lessons-page"]').waitFor();
  const proposedLessons = await waitForValue(
    () => api<{ lessons: LessonRecord[] }>(
      daemon!.handshake,
      `/api/drafts/${encodeURIComponent(draft.id)}/lessons`,
    ),
    ({ lessons }) =>
      lessons.length === 2
      && lessons.every(({ state }) => state === 'proposed'),
    UI_TIMEOUT_MS,
    'recovered Distill proposals were missing or duplicated',
  );
  const sessions = await api<{
    sessions: Array<{
      id: string;
      endCursor: number | null;
    }>;
  }>(
    daemon.handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/learning-sessions`,
  );
  assert(
    sessions.sessions.some((session) =>
      session.id === recoveredRun.sessionId
      && session.endCursor !== null),
    'session-end Distill did not recover its closed cursor',
  );
  for (const lesson of proposedLessons.lessons) {
    assert(
      lesson.evidence.length > 0
      && lesson.evidence.every(({ status }) => status === 'resolved'),
      `lesson ${lesson.id} did not render resolved decision provenance`,
    );
  }

  const local = proposedLessons.lessons.find(
    ({ classification }) => classification === 'episode-local',
  );
  const durable = proposedLessons.lessons.find(
    ({ classification }) => classification === 'durable',
  );
  assert(local && durable, 'mixed-scope Distill proposals were not created');
  const localReviewed =
    'Use the queue switch as the visible causal turn; do not generalize past this episode.';
  let localCard = page.locator(`#lesson-${local.id}`);
  await localCard.waitFor();
  await localCard.getByLabel('Reviewed lesson text').fill(localReviewed);
  await localCard.getByRole(
    'button',
    { name: 'Save review' },
  ).click();
  const editedLocal = await waitForValue(
    async () => (
      await api<{ lessons: LessonRecord[] }>(
        daemon!.handshake,
        `/api/drafts/${encodeURIComponent(draft.id)}/lessons`,
      )
    ).lessons.find(({ id }) => id === local.id) ?? null,
    (lesson): lesson is LessonRecord =>
      lesson !== null && lesson.reviewedMarkdown === localReviewed,
    UI_TIMEOUT_MS,
    'edited episode lesson was not returned',
  );
  assert(editedLocal, 'edited episode lesson lookup returned null');
  assert(
    editedLocal.reviewedMarkdown === localReviewed
      && editedLocal.proposedMarkdown === local.proposedMarkdown
      && editedLocal.state === 'proposed',
    'edit-before-approve did not preserve proposal and reviewed text',
  );
  await localCard.getByRole(
    'button',
    { name: 'Approve', exact: true },
  ).click();
  await localCard.getByRole(
    'button',
    { name: 'Confirm approve' },
  ).click();
  await waitForAttribute(localCard, 'data-state', 'approved');

  const firstEnvelopeId = await submitEnvelopeInspection(
    daemon.handshake,
    draft.id,
    'Envelope inspection while episode lesson is active.',
  );
  const firstEnvelope = await waitForTerminalOperation(
    daemon.handshake,
    firstEnvelopeId,
  );
  const firstInputs = recordValue(firstEnvelope.inputs);
  assert(
    JSON.stringify(firstInputs?.['approved_lessons'])
      === JSON.stringify([localReviewed]),
    'active episode lesson was not injected as exact reviewed text',
  );
  assert(
    firstEnvelope.operationLessons.length === 1
      && firstEnvelope.operationLessons[0]?.lessonId === local.id,
    'active episode lesson provenance was not recorded on the operation',
  );
  await page.goto(
    `${baseUrl}/console#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  const firstConsoleOperation = page.locator(
    'app-agent-console nav button',
  ).filter({ hasText: firstEnvelopeId });
  await firstConsoleOperation.waitFor();
  await firstConsoleOperation.click();
  const suppliedLessons = page.locator(
    'app-agent-console .supplied-lessons',
  );
  await waitForText(suppliedLessons, localReviewed);
  assert(
    await suppliedLessons.locator('ol li p').allTextContents()
      .then((values) => JSON.stringify(values))
      === JSON.stringify([localReviewed]),
    'console did not show exactly the immutable reviewed lesson text',
  );
  await waitForText(suppliedLessons, local.id);

  await page.goto(
    `${baseUrl}/lessons#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  localCard = page.locator(`#lesson-${local.id}`);
  await localCard.waitFor();
  await localCard.getByRole(
    'button',
    { name: 'Retire', exact: true },
  ).click();
  await localCard.getByRole(
    'button',
    { name: 'Confirm retire' },
  ).click();
  await waitForAttribute(localCard, 'data-state', 'retired');

  const retiredEnvelopeId = await submitEnvelopeInspection(
    daemon.handshake,
    draft.id,
    'Envelope inspection after episode lesson retirement.',
  );
  const retiredEnvelope = await waitForTerminalOperation(
    daemon.handshake,
    retiredEnvelopeId,
  );
  const retiredInputs = recordValue(retiredEnvelope.inputs);
  assert(
    Array.isArray(retiredInputs?.['approved_lessons'])
      && retiredInputs?.['approved_lessons'].length === 0
      && retiredEnvelope.operationLessons.length === 0,
    'retired episode lesson remained in the next operation envelope',
  );
  await page.goto(
    `${baseUrl}/console#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  const retiredConsoleOperation = page.locator(
    'app-agent-console nav button',
  ).filter({ hasText: retiredEnvelopeId });
  await retiredConsoleOperation.waitFor();
  await retiredConsoleOperation.click();
  const retiredSupplied = page.locator(
    'app-agent-console .supplied-lessons',
  );
  await waitForText(retiredSupplied, 'None');
  assert(
    await retiredSupplied.locator('ol li p').count() === 0,
    'console showed episode lesson text after retirement',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount,
    'episode lesson review and retirement',
  );
  assertDoctrineClean(
    workspace.worktreePath,
    'episode lesson review and retirement',
  );

  await page.goto(
    `${baseUrl}/lessons#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  let durableCard = page.locator(`#lesson-${durable.id}`);
  await durableCard.waitFor();
  await durableCard.getByRole(
    'button',
    { name: 'Approve', exact: true },
  ).click();
  await durableCard.getByRole(
    'button',
    { name: 'Confirm approve' },
  ).click();
  await waitForAttribute(
    durableCard,
    'data-state',
    'approved-pending-reconcile',
  );
  const prepared = await getLesson(
    daemon.handshake,
    draft.id,
    durable.id,
  );
  assert(
    prepared.reconciliation?.kind === 'apply'
      && prepared.reconciliation.state === 'prepared'
      && prepared.reconciliation.preparedMarkdown.includes(
        durable.proposedMarkdown ?? '',
      )
      && prepared.reconciliation.preparedMarkdown.includes('$reconcile-whp')
      && prepared.evidence.every(({ id }) =>
        prepared.reconciliation!.preparedMarkdown.includes(id)),
    'durable approval did not prepare an evidence-rich reconcile handoff',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount,
    'prepared durable reconciliation',
  );
  assertDoctrineClean(
    workspace.worktreePath,
    'prepared durable reconciliation',
  );
  await durableCard.getByRole(
    'button',
    { name: 'I started external reconciliation' },
  ).click();
  const awaiting = await waitForValue(
    () => getLesson(daemon!.handshake, draft.id, durable.id),
    (lesson) =>
      lesson.reconciliation?.state === 'awaiting-reconciliation',
    UI_TIMEOUT_MS,
    'durable handoff did not enter awaiting-reconciliation',
  );

  await stopDaemon(daemon);
  daemon = null;
  daemon = await startDaemon(
    cloneServer,
    runtimeFile,
    daemonEnvironment,
    'plan7-flow',
  );
  baseUrl = `http://127.0.0.1:${daemon.handshake.port}`;
  await page.goto(
    `${baseUrl}/lessons#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  durableCard = page.locator(`#lesson-${durable.id}`);
  await durableCard.waitFor();
  const recoveredLessons = await api<{ lessons: LessonRecord[] }>(
    daemon.handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/lessons`,
  );
  const recoveredDurable = recoveredLessons.lessons.find(
    ({ id }) => id === durable.id,
  );
  assert(
    recoveredLessons.lessons.length === 2
      && recoveredDurable?.reconciliation?.resumeKey
        === awaiting.reconciliation?.resumeKey
      && recoveredDurable?.reconciliation?.state
        === 'awaiting-reconciliation',
    'awaiting durable handoff did not recover without duplication',
  );

  const repositoryHeadBeforeReconcile = gitOutput(
    workspace.worktreePath,
    ['rev-parse', 'HEAD'],
  );
  await durableCard.getByLabel('Resulting external commit').fill(
    repositoryHeadBeforeReconcile,
  );
  await durableCard.getByRole(
    'button',
    { name: 'Verify external commit' },
  ).click();
  await waitForText(
    page.locator('[data-testid="lessons-page"] [role="alert"]'),
    'reconciliation commit',
  );
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.count()) await dismiss.click();
  assertDoctrineClean(
    workspace.worktreePath,
    'failed reconciliation verification',
  );

  const durableReviewed = durable.reviewedMarkdown
    ?? durable.proposedMarkdown
    ?? '';
  assert(
    durableReviewed !== '',
    'durable proposal has no reviewed reconciliation text',
  );
  const decisionsPath = join(workspace.worktreePath, 'DECISIONS.md');
  const steeringPath = join(
    workspace.worktreePath,
    'whp-youtube',
    'STEERING.md',
  );
  writeFileSync(
    decisionsPath,
    `${readFileSync(decisionsPath, 'utf8').trimEnd()}\n\n`
      + '## 2026-07-24 — Simulated reviewed lesson reconciliation\n\n'
      + `- ${durableReviewed}\n`,
  );
  writeFileSync(
    steeringPath,
    `${readFileSync(steeringPath, 'utf8').trimEnd()}\n\n`
      + '## Simulated reviewed lesson doctrine\n\n'
      + `${durableReviewed}\n`,
  );
  run('git', [
    '-C',
    workspace.worktreePath,
    'add',
    '--',
    'DECISIONS.md',
    'whp-youtube/STEERING.md',
  ]);
  run('git', [
    '-C',
    workspace.worktreePath,
    'commit',
    '-m',
    'docs(whp): simulate reviewed lesson reconciliation',
  ]);
  const reconcileCommit = gitOutput(
    workspace.worktreePath,
    ['rev-parse', 'HEAD'],
  );
  assert(
    gitRawOutput(workspace.worktreePath, [
      'status',
      '--porcelain=v1',
      '--',
      '.agents/skills',
    ]) === '',
    'external reconciliation simulation changed a skill file',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount + 1,
    'external reconciliation commit',
  );

  await durableCard.getByLabel('Resulting external commit').fill(
    reconcileCommit,
  );
  await durableCard.getByRole(
    'button',
    { name: 'Verify external commit' },
  ).click();
  await waitForAttribute(durableCard, 'data-state', 'applied');
  const applied = await getLesson(
    daemon.handshake,
    draft.id,
    durable.id,
  );
  assert(
    applied.proposedMarkdown === null
      && applied.reviewedMarkdown === null
      && applied.repositoryProvenance?.status === 'resolved'
      && applied.reconciliation?.state === 'verified',
    'verified durable application did not become repository-native',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount + 1,
    'app verification of external reconciliation',
  );
  assertDoctrineClean(
    workspace.worktreePath,
    'app verification of external reconciliation',
  );

  await durableCard.getByRole(
    'button',
    { name: 'Retire', exact: true },
  ).click();
  await durableCard.getByRole(
    'button',
    { name: 'Confirm retire' },
  ).click();
  await waitForAttribute(
    durableCard,
    'data-state',
    'retirement-pending',
  );
  const retirement = await getLesson(
    daemon.handshake,
    draft.id,
    durable.id,
  );
  assert(
    retirement.reconciliation?.kind === 'retire'
      && retirement.reconciliation.state === 'prepared'
      && retirement.reconciliation.preparedMarkdown.includes(
        'retire this applied durable doctrine',
      ),
    'durable retirement did not prepare a reconcile handoff',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount + 1,
    'prepared durable retirement',
  );
  assertDoctrineClean(
    workspace.worktreePath,
    'prepared durable retirement',
  );

  const staleBytes = readFileSync(steeringPath, 'utf8').replace(
    durableReviewed,
    `${durableReviewed} [externally changed]`,
  );
  assert(
    staleBytes !== readFileSync(steeringPath, 'utf8'),
    'could not mutate the verified doctrine pointer for stale-state coverage',
  );
  writeFileSync(steeringPath, staleBytes);
  await page.reload({ waitUntil: 'domcontentloaded' });
  durableCard = page.locator(`#lesson-${durable.id}`);
  await waitForText(
    durableCard.locator('.stale-pointer'),
    'Blocking stale repository pointer',
  );
  const stale = await getLesson(
    daemon.handshake,
    draft.id,
    durable.id,
  );
  assert(
    stale.repositoryProvenance?.status === 'unresolved',
    'changed repository doctrine was not shown as stale',
  );
  assert(
    readFileSync(steeringPath, 'utf8') === staleBytes,
    'stale-state refresh rewrote repository doctrine',
  );
  assertCommitCount(
    cloneRoot,
    initialCommitCount + 1,
    'stale repository pointer display',
  );

  await page.goto(
    `${baseUrl}/?draft=${encodeURIComponent(draft.id)}`
      + `#nonce=${daemon.handshake.nonce}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.locator('app-production-panel').waitFor();
  return reconcileCommit;
}

async function submitEnvelopeInspection(
  handshake: RuntimeHandshake,
  draftId: string,
  selection: string,
): Promise<string> {
  const submitted = await api<{ id: string }>(
    handshake,
    `/api/drafts/${encodeURIComponent(draftId)}/ops`,
    {
      method: 'POST',
      body: {
        operation: 'rewrite-selection',
        inputs: {
          selection,
          approved_lessons: ['forged browser lesson'],
          requested_scope: 'Return one bounded replacement.',
        },
      },
    },
  );
  return submitted.id;
}

async function waitForTerminalOperation(
  handshake: RuntimeHandshake,
  operationId: string,
): Promise<OperationRecord> {
  return waitForValue(
    () => api<OperationRecord>(
      handshake,
      `/api/ops/${encodeURIComponent(operationId)}`,
    ),
    (operation) => [
      'cancelled',
      'completed',
      'failed',
      'interrupted',
      'invalid-output',
      'timed-out',
    ].includes(operation.state),
    UI_TIMEOUT_MS,
    `operation ${operationId} did not reach a terminal state`,
  ).then((operation) => {
    assert(
      operation.state === 'completed',
      `operation ${operationId} ended in ${operation.state}`,
    );
    return operation;
  });
}

function getLesson(
  handshake: RuntimeHandshake,
  draftId: string,
  lessonId: string,
): Promise<LessonRecord> {
  return api<LessonRecord>(
    handshake,
    `/api/drafts/${encodeURIComponent(draftId)}/lessons/${
      encodeURIComponent(lessonId)
    }`,
  );
}

function assertCommitCount(
  cloneRoot: string,
  expected: number,
  stage: string,
): void {
  const count = Number(
    gitOutput(cloneRoot, ['rev-list', '--count', '--all']),
  );
  assert(
    count === expected,
    `unexpected commit count at ${stage}: expected ${expected}, got ${count}`,
  );
}

function assertDoctrineClean(worktreePath: string, stage: string): void {
  const status = gitRawOutput(worktreePath, [
    'status',
    '--porcelain=v1',
    '--',
    'DECISIONS.md',
    'BRAND.md',
    'STEERING.md',
    'whp-youtube/STEERING.md',
    '.agents/skills',
  ]);
  assert(
    status === '',
    `app changed doctrine before external action at ${stage}: ${status}`,
  );
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function selectTopicRun(
  page: Page,
  expectedRunId: string,
): Promise<void> {
  const rows = page.locator('[data-testid="topic-run-row"]');
  await waitForMinimumCount(rows, 1);
  const matchingRow = await waitForValue(
    async () => {
      const summaries = await api<Array<{ id: string }>>(
        daemon!.handshake,
        '/api/topic-runs',
      );
      return summaries.some(({ id }) => id === expectedRunId)
        ? rows.first()
        : null;
    },
    (row): row is Locator => row !== null,
    UI_TIMEOUT_MS,
    'seeded topic run was not listed',
  );
  assert(matchingRow, 'seeded topic run lookup returned null');
  const select = matchingRow.getByRole(
    'button',
    { name: 'Select run' },
  );
  if (await select.count()) await select.click();
  await page.locator('[data-testid="winner-card"]').waitFor();
}

async function seedCompletedTopicRun(
  handshake: RuntimeHandshake,
): Promise<string> {
  const submitted = await api<{ id: string }>(
    handshake,
    '/api/ops',
    {
      method: 'POST',
      body: {
        operation: 'full-topic-run',
        inputs: {
          idea_text: 'How waiting becomes a game.',
          user_constraints: {},
        },
      },
    },
  );
  const registered = await api<{ id: string }>(
    handshake,
    '/api/topic-runs',
    {
      method: 'POST',
      body: { opId: submitted.id },
    },
  );
  await waitForValue(
    () => api<{
      state: string;
      summary?: {
        winner?: {
          subject?: string;
        };
      } | null;
    }>(
      handshake,
      `/api/topic-runs/${encodeURIComponent(registered.id)}`,
    ),
    (snapshot) =>
      snapshot.state === 'completed'
      && snapshot.summary?.winner?.subject === 'The Queue Game',
    UI_TIMEOUT_MS,
    'fake topic run did not produce the deterministic winner',
  );
  return registered.id;
}

async function api<T>(
  handshake: RuntimeHandshake,
  path: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const response = await fetch(
    `http://127.0.0.1:${handshake.port}${path}`,
    {
      method: options.method,
      headers: {
        'content-type': 'application/json',
        'x-sc-nonce': handshake.nonce,
      },
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    },
  );
  const text = await response.text();
  let value: unknown = null;
  if (text !== '') {
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
  }
  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} returned ${response.status}: ${
        typeof value === 'string' ? value : JSON.stringify(value)
      }`,
    );
  }
  return value as T;
}

async function startDaemon(
  serverDir: string,
  runtimeFile: string,
  injectedEnvironment: Record<string, string>,
  fakeMode: string,
): Promise<RunningDaemon> {
  rmSync(runtimeFile, { force: true });
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    ...injectedEnvironment,
    FAKE_CODEX_MODE: fakeMode,
  };
  delete environment['FAKE_PROMOTE_MODE'];
  delete environment['FAKE_OPERATION_STATUS'];
  mkdirSync(dirname(runtimeFile), { recursive: true });
  const stdoutFile = `${runtimeFile}.stdout.log`;
  const stderrFile = `${runtimeFile}.stderr.log`;
  const stdoutFd = openSync(stdoutFile, 'w');
  const stderrFd = openSync(stderrFile, 'w');
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'src/daemon.ts', '--port', '0'],
    {
      cwd: serverDir,
      env: environment,
      stdio: ['ignore', stdoutFd, stderrFd],
    },
  );
  closeSync(stdoutFd);
  closeSync(stderrFd);
  const childClosed = new Promise<void>((resolveClose) => {
    child.once('close', () => resolveClose());
  });
  const readLog = (path: string) =>
    existsSync(path)
      ? readFileSync(path, 'utf8').slice(-8_192)
      : '';
  try {
    const publishedHandshake = await waitForValue(
      async () => {
        if (child.exitCode !== null) {
          await childClosed;
          throw new Error(
            `daemon exited ${child.exitCode}; stdout=${
              readLog(stdoutFile)
            }; stderr=${readLog(stderrFile)}`,
          );
        }
        if (!existsSync(runtimeFile)) return null;
        try {
          const parsed = JSON.parse(
            readFileSync(runtimeFile, 'utf8'),
          ) as RuntimeHandshake;
          return parsed.pid === child.pid ? parsed : null;
        } catch {
          return null;
        }
      },
      (value): value is RuntimeHandshake => value !== null,
      UI_TIMEOUT_MS,
      `daemon did not publish ${runtimeFile}`,
    );
    assert(
      publishedHandshake,
      `daemon handshake remained absent: ${runtimeFile}`,
    );
    const running: RunningDaemon = {
      child,
      runtimeFile,
      handshake: publishedHandshake,
      stdout: () => readLog(stdoutFile),
      stderr: () => readLog(stderrFile),
    };
    const response = await fetch(
      `http://127.0.0.1:${running.handshake.port}/`,
    );
    assert(
      response.ok,
      `daemon did not serve the built app: HTTP ${response.status}`,
    );
    return running;
  } catch (error) {
    const handshake = readHandshake(runtimeFile);
    const pid = handshake?.pid ?? child.pid;
    if (pid && isPidAlive(pid)) process.kill(pid, 'SIGTERM');
    if (!await waitForChildExit(child, 5_000) && pid && isPidAlive(pid)) {
      process.kill(pid, 'SIGKILL');
      await waitForChildExit(child, 5_000);
    }
    throw error;
  }
}

async function stopDaemon(running: RunningDaemon): Promise<void> {
  const handshake = readHandshake(running.runtimeFile)
    ?? running.handshake;
  if (isPidAlive(handshake.pid)) {
    process.kill(handshake.pid, 'SIGTERM');
  }
  const exited = await waitForChildExit(running.child, 10_000);
  if (!exited && isPidAlive(handshake.pid)) {
    process.kill(handshake.pid, 'SIGKILL');
    await waitForChildExit(running.child, 5_000);
  }
  assert(
    !isPidAlive(handshake.pid),
    `daemon handshake pid ${handshake.pid} survived cleanup`,
  );
}

function readHandshake(runtimeFile: string): RuntimeHandshake | null {
  if (!existsSync(runtimeFile)) return null;
  try {
    return JSON.parse(
      readFileSync(runtimeFile, 'utf8'),
    ) as RuntimeHandshake;
  } catch {
    return null;
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function waitForChildExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolveExit) => {
    const timeout = setTimeout(() => {
      child.removeListener('exit', onExit);
      resolveExit(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolveExit(true);
    };
    child.once('exit', onExit);
  });
}

async function launchChromium(): Promise<Browser> {
  const requested = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
  const systemCandidates = [
    requested,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ].filter((candidate): candidate is string =>
    typeof candidate === 'string' && existsSync(candidate));
  return chromium.launch({
    headless: true,
    executablePath: systemCandidates[0],
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });
}

function copyNodeModules(
  relativePackageDir: string,
  cloneRoot: string,
): void {
  const source = join(SOURCE_REPO, relativePackageDir, 'node_modules');
  const target = join(cloneRoot, relativePackageDir, 'node_modules');
  assert(
    existsSync(source),
    `${relativePackageDir}/node_modules is required; run npm install first`,
  );
  symlinkSync(source, target, 'dir');
}

function applyTrackedWorktreeChanges(
  sourceRoot: string,
  cloneRoot: string,
  sourceStatus: string,
): void {
  for (const line of sourceStatus.split('\n')) {
    if (line === '' || line.startsWith('?? ')) continue;
    const status = line.slice(0, 2);
    const relativePath = line.slice(3);
    assert(
      !status.includes('D')
        && !status.includes('R')
        && !status.includes('C')
        && !relativePath.includes(' -> '),
      `sweep cannot snapshot non-file worktree change: ${line}`,
    );
    const source = join(sourceRoot, relativePath);
    const target = join(cloneRoot, relativePath);
    assert(
      existsSync(source),
      `tracked source change is missing: ${relativePath}`,
    );
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}

function assertSymlinkFreeSkills(cloneRoot: string): void {
  const result = spawnSync(
    'find',
    [
      join(cloneRoot, '.agents', 'skills'),
      '-type',
      'l',
      '-print',
      '-quit',
    ],
    { encoding: 'utf8' },
  );
  assert(
    result.status === 0,
    `could not inspect cloned skills: ${result.stderr}`,
  );
  assert(
    result.stdout.trim() === '',
    'temporary repository contains symlinked .agents skill files',
  );
}

function run(
  command: string,
  args: string[],
  cwd?: string,
  timeout = 60_000,
): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
    timeout,
  });
  if (result.status === 0) return;
  throw new Error(
    `${command} ${args.join(' ')} failed (${String(result.status)}): ${
      `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().slice(-4_096)
    }`,
  );
}

function runOptional(command: string, args: string[]): boolean {
  return spawnSync(command, args, {
    encoding: 'utf8',
  }).status === 0;
}

function gitOutput(cwd: string, args: string[]): string {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

function gitRawOutput(cwd: string, args: string[]): string {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr.trim()}`,
    );
  }
  return result.stdout.trimEnd();
}

function assertFileContains(path: string, expected: string): void {
  assert(existsSync(path), `expected file is missing: ${path}`);
  assert(
    readFileSync(path, 'utf8').includes(expected),
    `${path} does not contain ${JSON.stringify(expected)}`,
  );
}

async function selectEditorParagraph(
  page: Page,
  editor: Locator,
  index: number,
): Promise<void> {
  const paragraph = editor.locator('p').nth(index);
  await paragraph.click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await waitForValue(
    () => page.locator(
      '[role="toolbar"][aria-label="Selected text actions"]',
    ).isVisible(),
    Boolean,
    UI_TIMEOUT_MS,
    `selection toolbar did not open for paragraph ${index}`,
  );
}

async function waitForEditorSave(page: Page): Promise<void> {
  const badge = page.locator('[data-testid="unsaved-badge"]');
  await waitForValue(
    () => badge.count(),
    (count) => count === 0,
    UI_TIMEOUT_MS,
    'editor autosave did not settle',
  );
}

async function waitForEnabled(locator: Locator): Promise<void> {
  await waitForValue(
    () => locator.isEnabled(),
    Boolean,
    UI_TIMEOUT_MS,
    'button did not become enabled',
  );
}

async function assertArchitectureEditingDisabled(
  architecturePanel: Locator,
  section: Locator,
): Promise<void> {
  for (const control of [
    architecturePanel.getByLabel('Architecture generation constraints'),
    architecturePanel.getByRole(
      'button',
      { name: 'Generate architecture' },
    ),
    architecturePanel.getByRole(
      'button',
      { name: 'Review architecture' },
    ),
    section.getByLabel('Refine Core answer'),
    section.getByRole('button', { name: 'Refine section' }),
  ]) {
    assert(
      await control.isDisabled(),
      `approved or paused architecture control remained enabled: ${
        await control.getAttribute('aria-label')
          ?? await control.textContent()
          ?? control.toString()
      }`,
    );
  }
}

async function waitForCount(
  locator: Locator,
  expected: number,
): Promise<void> {
  await waitForValue(
    () => locator.count(),
    (count) => count === expected,
    UI_TIMEOUT_MS,
    `locator count did not become ${expected}`,
  );
}

async function waitForMinimumCount(
  locator: Locator,
  minimum: number,
): Promise<void> {
  await waitForValue(
    () => locator.count(),
    (count) => count >= minimum,
    UI_TIMEOUT_MS,
    `locator count did not reach ${minimum}`,
  );
}

async function waitForText(
  locator: Locator,
  expected: string,
): Promise<void> {
  await waitForValue(
    () => locator.textContent(),
    (text) => text?.includes(expected) === true,
    UI_TIMEOUT_MS,
    `locator did not contain ${JSON.stringify(expected)}`,
  );
}

async function waitForMissingText(
  locator: Locator,
  expected: string,
): Promise<void> {
  await waitForValue(
    () => locator.textContent(),
    (text) => text?.includes(expected) === false,
    UI_TIMEOUT_MS,
    `locator retained ${JSON.stringify(expected)}`,
  );
}

async function waitForAttribute(
  locator: Locator,
  attribute: string,
  expected: string,
): Promise<void> {
  await waitForValue(
    () => locator.getAttribute(attribute),
    (value) => value === expected,
    UI_TIMEOUT_MS,
    `${attribute} did not become ${JSON.stringify(expected)}`,
  );
}

async function waitForValue<T>(
  read: () => T | Promise<T>,
  accept: (value: T) => boolean,
  timeoutMs: number,
  failure: string,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T | undefined;
  for (;;) {
    lastValue = await read();
    if (accept(lastValue)) return lastValue;
    if (Date.now() >= deadline) {
      throw new Error(
        `${failure}; last value: ${describe(lastValue)}`,
      );
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, POLL_MS));
  }
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

async function runSweep(): Promise<void> {
  let failure: unknown = null;
  try {
    await main();
  } catch (error) {
    failure = error;
  } finally {
    try {
      await browser?.close();
    } catch (error) {
      failure ??= error;
    }
    try {
      if (daemon) await stopDaemon(daemon);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const daemonDetail = daemon
        ? ` stdout=${daemon.stdout()} stderr=${daemon.stderr()}`
        : '';
      failure ??= new Error(`${detail}${daemonDetail}`);
    }
    try {
      if (temporaryRoot) {
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
    } catch (error) {
      failure ??= error;
    }
  }

  if (failure) {
    console.error(
      `FAILED — Plan ${PLAN7_SWEEP ? '7' : '6'} browser sweep`,
    );
    console.error(
      `DETAIL — ${failure instanceof Error ? failure.stack : String(failure)}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `VERIFIED — Plan ${PLAN7_SWEEP ? '7' : '6'} browser sweep`,
    );
  }
}

void runSweep();
