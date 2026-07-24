import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
  renderApprovedArchitecture,
  splitArchitecture,
} from '../../src/architecture/codec.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const SKILL_REFERENCE_PATH = resolve(
  REPO_ROOT,
  '.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md',
);

const EXPECTED_SECTIONS = [
  { key: 'concept-inventory', title: 'Concept inventory' },
  { key: 'package-and-audience', title: 'Package and audience' },
  { key: 'central-question', title: 'Central question' },
  { key: 'core-answer', title: 'Core answer' },
  { key: 'viewer-belief-shift', title: 'Viewer belief shift' },
  { key: 'insight-ladder', title: 'Insight ladder' },
  {
    key: 'phenomenon-and-paradox-map',
    title: 'Phenomenon and paradox map',
  },
  { key: 'earned-reframe', title: 'Earned reframe' },
  { key: 'real-world-evidence-map', title: 'Real-world evidence map' },
  {
    key: 'learning-and-action-contract',
    title: 'Learning and action contract',
  },
  { key: 'practical-payoff', title: 'Practical payoff' },
  { key: 'final-lesson', title: 'Final lesson' },
  { key: 'scope-boundary', title: 'Scope boundary' },
] as const;

describe('architecture section contract', () => {
  it('defines the thirteen fixed sections in exact order', () => {
    expect(ARCHITECTURE_SECTIONS).toEqual(EXPECTED_SECTIONS);
  });

  it('stays synchronized with the skill-owned Architecture artifact headings', () => {
    const reference = readFileSync(SKILL_REFERENCE_PATH, 'utf8');
    const section = reference.match(
      /^## Architecture artifact\r?\n([\s\S]*?)\r?\n## /m,
    )?.[1];
    if (!section) throw new Error('Architecture artifact section was not found');
    const titles = [...section.matchAll(/^### (.+)$/gm)]
      .map((match) => match[1]!.trimEnd());

    expect(titles).toHaveLength(13);
    expect(ARCHITECTURE_SECTIONS.map(({ title }) => title)).toEqual(titles);
    expect(ARCHITECTURE_SECTIONS).toHaveLength(titles.length);
  });
});

describe('architecture heading codec', () => {
  it('recognizes every fixed section in order and joins its complete slices', () => {
    const markdown = EXPECTED_SECTIONS
      .map(({ title }, index) => `### ${title}\n\nBody ${index + 1}.\n\n`)
      .join('');

    const sections = splitArchitecture(markdown);

    expect(sections.map(({ key, title }) => ({ key, title })))
      .toEqual(EXPECTED_SECTIONS);
    expect(sections[0]!.md).toBe(
      '### Concept inventory\n\nBody 1.\n\n',
    );
    expect(joinArchitecture(sections)).toBe(markdown);
  });

  it('preserves CRLF and permits missing fixed sections without validation', () => {
    const markdown = [
      '### Central question',
      '',
      'Why?',
      '',
      '### Final lesson',
      '',
      'Because.',
      '',
    ].join('\r\n');

    const sections = splitArchitecture(markdown);

    expect(sections.map(({ key }) => key)).toEqual([
      'central-question',
      'final-lesson',
    ]);
    expect(joinArchitecture(sections)).toBe(markdown);
  });

  it('keeps duplicate and unrecognized headings as stable opaque sections', () => {
    const markdown = [
      '### Core answer',
      '',
      'First.',
      '',
      '### Core answer',
      '',
      'Duplicate.',
      '',
      '### A surprising extra',
      '',
      'Opaque.',
    ].join('\n');

    const first = splitArchitecture(markdown);
    const second = splitArchitecture(markdown);
    const bodyChanged = splitArchitecture(
      markdown.replace('Opaque.', 'Changed body.'),
    );

    expect(first[0]).toMatchObject({
      key: 'core-answer',
      title: 'Core answer',
    });
    expect(first[1]!.key).toMatch(/^opaque-/);
    expect(first[2]!.key).toMatch(/^opaque-/);
    expect(first[1]!.key).not.toBe(first[2]!.key);
    expect(first.map(({ key }) => key)).toEqual(second.map(({ key }) => key));
    expect(bodyChanged[2]!.key).toBe(first[2]!.key);
    expect(joinArchitecture(first)).toBe(markdown);
  });

  it('retains an opaque preamble and byte-identical split-to-join output', () => {
    const markdown = [
      '# Working architecture',
      '',
      'Do not discard this preamble.',
      '',
      '### Practical payoff',
      '',
      'A payoff.',
    ].join('\n');

    const sections = splitArchitecture(markdown);

    expect(sections[0]).toMatchObject({
      title: '',
      md: '# Working architecture\n\nDo not discard this preamble.\n\n',
    });
    expect(sections[0]!.key).toMatch(/^opaque-/);
    expect(sections[1]).toMatchObject({
      key: 'practical-payoff',
      title: 'Practical payoff',
    });
    expect(joinArchitecture(sections)).toBe(markdown);
  });
});

describe('approved architecture rendering', () => {
  it('adds only the mechanical title, approval date, and status header', () => {
    const approvedMd = '### Core answer\r\n\r\nExact body.\r\n';

    expect(renderApprovedArchitecture({
      title: 'Why We Play',
      approvedDate: '2026-07-24',
      approvedMd,
    })).toBe([
      '# Why We Play',
      '',
      '- **Approval date:** 2026-07-24',
      '- **Status:** approved',
      '',
      approvedMd,
    ].join('\n'));
  });
});
