import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  closeSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
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

const APP_DIR = resolve(__dirname, '..');
const SOURCE_REPO = resolve(APP_DIR, '../..');
const POLL_MS = 50;
const UI_TIMEOUT_MS = 30_000;

let browser: Browser | null = null;
let daemon: RunningDaemon | null = null;
let temporaryRoot: string | null = null;

async function main(): Promise<void> {
  const sourceHead = gitOutput(SOURCE_REPO, ['rev-parse', 'HEAD']);
  const sourceStatus = gitOutput(SOURCE_REPO, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  const sourceBranch = gitOutput(SOURCE_REPO, [
    'branch',
    '--show-current',
  ]);
  assert(sourceBranch !== '', 'source checkout must be on a branch');

  temporaryRoot = mkdtempSync(join(tmpdir(), 'whp-plan6-browser-'));
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
  run('git', ['-C', cloneRoot, 'config', 'user.name', 'Plan 6 Sweep']);
  run('git', [
    '-C',
    cloneRoot,
    'config',
    'user.email',
    'plan6-sweep@example.invalid',
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
    'plan6-flow',
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
  await waitForCount(proposals, 12);
  for (let remaining = 12; remaining > 0; remaining -= 1) {
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

  await architecturePanel.getByRole(
    'button',
    { name: 'Approve architecture' },
  ).click();
  await waitForAttribute(
    architecturePanel.locator('[data-testid="architecture-ribbon"]'),
    'data-state',
    'approved',
  );
  const narrationActions = page.locator('app-narration-actions');
  await waitForEnabled(narrationActions.getByRole(
    'button',
    { name: 'Generate episode' },
  ));
  const architecturePath = join(
    workspace.worktreePath,
    'whp-youtube',
    'architectures',
    'the-queue-game.md',
  );
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
  const editor = page.locator('[data-testid="editor"] .ProseMirror');
  await editor.waitFor();
  await waitForText(
    editor,
    'A queue quietly turns waiting into a strategic game.',
  );
  await waitForEditorSave(page);

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
    'A queue quietly turns waiting into a strategic game.',
  );

  await architecturePanel.getByRole(
    'button',
    { name: 'Approve architecture' },
  ).click();
  await waitForText(
    narrationActions,
    'Generate Episode can replace narration from the approved architecture',
  );
  await acceptEpisodeProposal();
  {
    const diag = await api<{
      narrationReconciliationRequired: boolean;
      approvedAt: string | null;
    }>(
      daemon!.handshake,
      `/api/drafts/${encodeURIComponent(draft.id)}/architecture`,
    );
    console.log(
      'DIAG post-accept server state:',
      JSON.stringify({
        flag: diag.narrationReconciliationRequired,
        approvedAt: diag.approvedAt,
      }),
    );
  }
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
    'whp-youtube/episodes/the-queue-game.md',
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
  assertNoCommit('promotion completion');

  await milestonePanel.getByRole(
    'button',
    { name: 'Refresh milestones' },
  ).click();
  const productionMilestone = milestonePanel
    .locator('[data-milestone-id]')
    .filter({ hasText: 'production-promotion' });
  await productionMilestone.waitFor();
  assertNoCommit('pending production milestone');

  await productionMilestone.locator('input[type="checkbox"]').check();
  const explicitCommit = productionMilestone.getByRole(
    'button',
    { name: 'Commit milestone' },
  );
  await waitForEnabled(explicitCommit);
  await explicitCommit.click();
  await productionMilestone.waitFor({ state: 'detached' });

  const finalCommitCount = Number(
    gitOutput(cloneRoot, ['rev-list', '--count', '--all']),
  );
  assert(
    finalCommitCount === initialCommitCount + 1,
    'explicit milestone action did not create exactly one commit',
  );
  const commitMessage = gitOutput(workspace.worktreePath, [
    'log',
    '-1',
    '--pretty=%s',
  ]);
  assert(
    commitMessage ===
      'feat(the-queue-game): record production promotion milestone',
    `unexpected milestone commit message: ${commitMessage}`,
  );
  assert(
    pageErrors.length === 0,
    `browser page errors: ${pageErrors.join(' | ')}`,
  );
  assert(
    gitOutput(SOURCE_REPO, ['rev-parse', 'HEAD']) === sourceHead,
    'developer checkout HEAD changed during the sweep',
  );
  assert(
    gitOutput(SOURCE_REPO, [
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ]) === sourceStatus,
    'developer checkout files changed during the sweep',
  );
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
  const environment = {
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
    const running = {
      child,
      runtimeFile,
      handshake: await waitForValue(
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
      ),
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

function assertFileContains(path: string, expected: string): void {
  assert(existsSync(path), `expected file is missing: ${path}`);
  assert(
    readFileSync(path, 'utf8').includes(expected),
    `${path} does not contain ${JSON.stringify(expected)}`,
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
    console.error('FAILED — Plan 6 browser sweep');
    console.error(
      `DETAIL — ${failure instanceof Error ? failure.stack : String(failure)}`,
    );
    process.exitCode = 1;
  } else {
    console.log('VERIFIED — Plan 6 browser sweep');
  }
}

void runSweep();
