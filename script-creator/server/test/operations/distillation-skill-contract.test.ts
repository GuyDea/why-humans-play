import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const SKILL_PATH = resolve(
  REPO_ROOT,
  '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
);
const REFERENCE_PATH = resolve(
  REPO_ROOT,
  '.agents/skills/writing-whp-youtube-scripts/references/lesson-distillation.md',
);

describe('Distill session lessons skill contract', () => {
  it('routes only the Distill operation to the lesson-distillation reference', () => {
    const skill = readFileSync(SKILL_PATH, 'utf8');

    expect(skill).toMatch(
      /For a \*\*Distill session lessons\*\* operation — and only for that operation — read\s+\[the lesson distillation method\]\(references\/lesson-distillation\.md\)\./u,
    );
    expect(skill.match(/references\/lesson-distillation\.md/gu))
      .toHaveLength(1);
  });

  it('keeps the server vocabulary synchronized with the skill-owned method', () => {
    const reference = readFileSync(REFERENCE_PATH, 'utf8');
    const serverFields = [
      'classification',
      'lesson_markdown',
      'rationale_markdown',
      'evidence',
      'proposed_target',
      'supersedes_lesson_id',
    ];
    const tableFields = Array.from(reference.matchAll(
      /^\| `([^`]+)` \|/gmu,
    ), (match) => match[1]);
    const classificationRow = reference.match(
      /^\| `classification` \| ([^\n]+)$/mu,
    )?.[1] ?? '';
    const classifications = Array.from(classificationRow.matchAll(
      /`(episode-local|durable)`/gu,
    ), (match) => match[1]);

    expect(tableFields).toEqual(serverFields);
    expect(classifications).toEqual(['episode-local', 'durable']);
    expect(reference).toMatch(
      /Durable application belongs exclusively to the `reconcile-whp` flow/u,
    );
  });
});
