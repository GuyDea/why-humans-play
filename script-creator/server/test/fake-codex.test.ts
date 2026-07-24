import { execFile, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_SECTIONS,
  splitArchitecture,
} from '../src/architecture/codec.js';
import {
  ARCHITECTURE_REVIEW_SCHEMA,
  ARCHITECTURE_REWRITE_SCHEMA,
  DISTILL_SCHEMA,
  GATE_CHECK_SCHEMA,
  REVIEW_SCHEMA,
} from '../src/operations/schemas.js';
import { validateAgainstSchema } from '../src/schema-validate.js';

const run = promisify(execFile);
const FAKE = join(import.meta.dirname, 'fake-codex.mjs');

describe('fake codex', () => {
  it('replays the plain fixture and honors -o', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-'));
    const out = join(dir, 'final.txt');
    const { stdout } = await run(process.execPath, [FAKE, 'exec', '--json', '-o', out, '-'], {
      env: { ...process.env, FAKE_CODEX_MODE: 'happy' },
    });
    const lines = stdout.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines[0].type).toBe('thread.started');
    expect(lines.at(-1).type).toBe('turn.completed');
    expect(lines.at(-1).usage.input_tokens).toBeGreaterThan(0);
    expect(readFileSync(out, 'utf8')).toBe('OK');
  });

  it('emits the resumed thread id on exec resume', async () => {
    const { stdout } = await run(process.execPath, [FAKE, 'exec', 'resume', 'tid-9', '--json', '-'], {
      env: { ...process.env, FAKE_CODEX_MODE: 'happy' },
    });
    expect(JSON.parse(stdout.trim().split('\n')[0]!).thread_id).toBe('tid-9');
  });

  it('omits usage in no-usage mode', async () => {
    const { stdout } = await run(process.execPath, [FAKE, 'exec', '--json', '-'], {
      env: { ...process.env, FAKE_CODEX_MODE: 'no-usage' },
    });
    const last = JSON.parse(stdout.trim().split('\n').at(-1)!);
    expect(last.type).toBe('turn.completed');
    expect(last.usage).toBeUndefined();
  });

  it('synthesizes a conforming review result from the output schema', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-review-'));
    const schema = join(dir, 'review.schema.json');
    const out = join(dir, 'final.json');
    writeFileSync(schema, JSON.stringify(REVIEW_SCHEMA));

    await run(process.execPath, [
      FAKE,
      'exec',
      '--json',
      '--output-schema',
      schema,
      '-o',
      out,
      '-',
    ], {
      env: { ...process.env, FAKE_CODEX_MODE: 'operation-schema' },
    });

    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual({
      status: 'complete',
      findings: [
        {
          anchor: 'Fake anchor.',
          severity: 'blocking',
          finding_markdown: 'Fake finding_markdown.',
          optional_direction_markdown: null,
        },
        {
          anchor: 'Fake anchor.',
          severity: 'important',
          finding_markdown: 'Fake finding_markdown.',
          optional_direction_markdown: null,
        },
        {
          anchor: 'Fake anchor.',
          severity: 'optional',
          finding_markdown: 'Fake finding_markdown.',
          optional_direction_markdown: null,
        },
      ],
      guardrail_markdown: null,
    });
  });

  it('synthesizes the schema minItems count for arrays', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-gate-check-'));
    const schema = join(dir, 'gate-check.schema.json');
    const out = join(dir, 'final.json');
    writeFileSync(schema, JSON.stringify(GATE_CHECK_SCHEMA));

    await run(process.execPath, [
      FAKE,
      'exec',
      '--json',
      '--output-schema',
      schema,
      '-o',
      out,
      '-',
    ], {
      env: { ...process.env, FAKE_CODEX_MODE: 'operation-schema' },
    });

    expect(JSON.parse(readFileSync(out, 'utf8')).gates).toHaveLength(6);
  });

  it('writes a complete heading-structured Generate Architecture result with one opaque extra section', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-generate-architecture-'));
    const out = join(dir, 'architecture.md');

    await run(process.execPath, [
      FAKE,
      'exec',
      '--json',
      '-o',
      out,
      '-',
    ], {
      env: { ...process.env, FAKE_CODEX_MODE: 'generate-architecture' },
    });

    const markdown = readFileSync(out, 'utf8');
    const parsed = splitArchitecture(markdown);
    expect(parsed.filter((section) =>
      ARCHITECTURE_SECTIONS.some(({ key }) => key === section.key)
    ).map(({ key }) => key)).toEqual(
      ARCHITECTURE_SECTIONS.map(({ key }) => key),
    );
    expect(parsed.filter((section) => section.key.startsWith('opaque-')))
      .toMatchObject([{
        title: 'Fixture-only production note',
      }]);
  });

  it('cycles every architecture section key and severity in strict schema output', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-review-architecture-'));
    const schema = join(dir, 'review.schema.json');
    const out = join(dir, 'review.json');
    writeFileSync(schema, JSON.stringify(ARCHITECTURE_REVIEW_SCHEMA));

    await run(process.execPath, [
      FAKE,
      'exec',
      '--json',
      '--output-schema',
      schema,
      '-o',
      out,
      '-',
    ], {
      env: { ...process.env, FAKE_CODEX_MODE: 'review-architecture' },
    });

    const result = JSON.parse(readFileSync(out, 'utf8'));
    expect(result).toEqual({
      status: 'complete',
      findings: ARCHITECTURE_SECTIONS.map(({ key }, index) => ({
        section_key: key,
        severity: ['blocking', 'important', 'optional'][index % 3],
        finding_markdown: 'Fake finding_markdown.',
      })),
      guardrail_markdown: null,
    });
  });

  it('emits a strict rewrite result in Rewrite Architecture Section mode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-rewrite-architecture-'));
    const schema = join(dir, 'rewrite.schema.json');
    const out = join(dir, 'rewrite.json');
    writeFileSync(schema, JSON.stringify(ARCHITECTURE_REWRITE_SCHEMA));

    await run(process.execPath, [
      FAKE,
      'exec',
      '--json',
      '--output-schema',
      schema,
      '-o',
      out,
      '-',
    ], {
      env: {
        ...process.env,
        FAKE_CODEX_MODE: 'rewrite-architecture-section',
      },
    });

    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual({
      status: 'complete',
      section_key: 'core-answer',
      replacement_markdown:
        '### Core answer\n\nFake rewrite for core-answer.\n',
      guardrail_markdown: null,
    });
  });

  it.each([
    ['distill-complete', 'complete'],
    ['distill-duplicate-prior', 'complete'],
    ['distill-valid-supersession', 'complete'],
    ['distill-invalid-evidence', 'complete'],
    ['distill-narrowed', 'narrowed'],
    ['distill-declined', 'declined'],
    ['plan7-flow', 'complete'],
    ['plan6-flow', 'complete'],
  ] as const)(
    'emits the %s deterministic Distill fixture from submitted frozen inputs',
    async (mode, status) => {
      const decisions = [
        { id: 'submitted-decision-1', kind: 'proposal-accepted' },
        { id: 'submitted-decision-2', kind: 'proposal-rejected' },
      ];
      const existingLessons = [{
        id: 'submitted-lesson-1',
        classification: 'episode-local',
        state: 'approved',
        lesson_markdown: 'Keep the opening grounded in a visible choice.',
      }];
      const result = await runDistillFake(mode, {
        session: {
          id: 'submitted-session-1',
          draft_id: 'submitted-draft-1',
          trigger: 'on-demand',
          decisions,
        },
        existing_lessons: existingLessons,
      });

      expect(validateAgainstSchema(
        DISTILL_SCHEMA,
        JSON.stringify(result),
      ).ok).toBe(true);
      expect(result.status).toBe(status);

      if (status !== 'complete') {
        expect(result.lessons).toEqual([]);
        expect(result.guardrail_markdown).toEqual(expect.any(String));
        return;
      }

      expect(result.lessons.length).toBeGreaterThan(0);
      for (const lesson of result.lessons) {
        expect(Object.keys(lesson)).toEqual([
          'classification',
          'lesson_markdown',
          'rationale_markdown',
          'evidence',
          'proposed_target',
          'supersedes_lesson_id',
        ]);
      }
      if (mode === 'distill-complete' || mode.endsWith('-flow')) {
        expect(result.lessons.map((lesson: any) => lesson.classification))
          .toEqual(['episode-local', 'durable']);
        expect(result.lessons.flatMap((lesson: any) => lesson.evidence))
          .toEqual([
            'submitted-decision-1',
            'submitted-decision-2',
          ]);
      }
      if (mode === 'distill-duplicate-prior') {
        expect(result.lessons[0]).toMatchObject({
          lesson_markdown:
            'Keep the opening grounded in a visible choice.',
          evidence: ['submitted-decision-1'],
        });
      }
      if (mode === 'distill-valid-supersession') {
        expect(result.lessons[0]).toMatchObject({
          evidence: ['submitted-decision-1'],
          supersedes_lesson_id: 'submitted-lesson-1',
        });
      }
      if (mode === 'distill-invalid-evidence') {
        expect(result.lessons[0].evidence).not.toContain(
          'submitted-decision-1',
        );
        expect(result.lessons[0].evidence).not.toContain(
          'submitted-decision-2',
        );
      } else {
        expect(result.lessons.flatMap((lesson: any) => lesson.evidence)
          .every((id: string) =>
            decisions.some((decision) => decision.id === id)))
          .toBe(true);
      }
    },
  );

  it.each([
    ['valid', true, 'Promotion output written.'],
    ['invalid-production', true, 'Invalid production fixture written.'],
    ['guardrail', false, 'Guardrail: promotion declined.'],
  ] as const)(
    'runs the %s deterministic Promote fixture mode',
    async (promoteMode, writesTarget, report) => {
      const repo = mkdtempSync(join(tmpdir(), `fake-promote-${promoteMode}-`));
      const out = join(repo, 'result.md');
      const target = 'whp-youtube/episodes/01-fixture.md';
      mkdirSync(join(repo, 'whp-youtube', 'episodes'), { recursive: true });
      writeFileSync(join(repo, 'envelope.json'), JSON.stringify({
        prompt: [
          '$writing-whp-youtube-scripts',
          'Operation: Promote',
          `Inputs: ${JSON.stringify({ target_path: target })}`,
        ].join('\n'),
      }));
      const child = spawn(
        process.execPath,
        [FAKE, 'exec', '--json', '-C', repo, '-o', out, '-'],
        {
          env: {
            ...process.env,
            FAKE_CODEX_MODE: 'plan6-flow',
            FAKE_PROMOTE_MODE: promoteMode,
          },
          stdio: ['pipe', 'ignore', 'pipe'],
        },
      );
      child.stdin.end();
      await new Promise<void>((resolve, reject) => {
        let stderr = '';
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        child.once('error', reject);
        child.once('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`fake Promote exited ${code}: ${stderr}`));
        });
      });

      expect(readFileSync(out, 'utf8')).toBe(report);
      expect(existsSync(join(repo, target))).toBe(writesTarget);
      if (promoteMode === 'valid') {
        expect(readFileSync(join(repo, target), 'utf8')).toContain(
          '### Script metadata',
        );
      }
      if (promoteMode === 'invalid-production') {
        expect(readFileSync(join(repo, target), 'utf8')).toBe(
          '# Invalid production fixture\n',
        );
      }
    },
  );
});

async function runDistillFake(
  mode: string,
  inputs: unknown,
): Promise<any> {
  const dir = mkdtempSync(join(tmpdir(), `fake-${mode}-`));
  const schema = join(dir, 'distill.schema.json');
  const out = join(dir, 'distill.json');
  writeFileSync(schema, JSON.stringify(DISTILL_SCHEMA));
  const prompt = [
    '$writing-whp-youtube-scripts',
    'Operation: Distill session lessons',
    `Inputs: ${JSON.stringify(inputs)}`,
  ].join('\n');
  writeFileSync(
    join(dir, 'envelope.json'),
    JSON.stringify({ prompt }),
  );

  const pending = run(process.execPath, [
    FAKE,
    'exec',
    '--json',
    '--output-schema',
    schema,
    '-o',
    out,
    '-',
  ], {
    env: { ...process.env, FAKE_CODEX_MODE: mode },
  });
  pending.child.stdin?.end(prompt);
  await pending;

  return JSON.parse(readFileSync(out, 'utf8'));
}
