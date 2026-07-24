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
  GATE_CHECK_SCHEMA,
  REVIEW_SCHEMA,
} from '../src/operations/schemas.js';

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
      replacement_markdown:
        '### Core answer\n\nFake rewrite for core-answer.\n',
      guardrail_markdown: null,
    });
  });

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
