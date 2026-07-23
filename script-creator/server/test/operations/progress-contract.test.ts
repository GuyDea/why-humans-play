import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WHP_PROGRESS_ROWS,
  WHP_PROGRESS_VERSION,
} from '../../src/operations/progress.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const SKILL_PATH = resolve(
  REPO_ROOT,
  '.agents/skills/choosing-whp-video-topic/SKILL.md',
);
const MANIFEST_PATH = resolve(
  REPO_ROOT,
  '.agents/skills/choosing-whp-video-topic/references/run-progress-transport.md',
);

describe('WHP progress transport contract', () => {
  it('matches the skill checklist and owned manifest row-for-row', () => {
    const skillRows = parseSkillChecklist(readFileSync(SKILL_PATH, 'utf8'));
    const manifest = readFileSync(MANIFEST_PATH, 'utf8');
    const manifestRows = parseManifestRows(manifest);

    expect(manifest).toContain(
      `progress_transport: "${WHP_PROGRESS_VERSION}"`,
    );
    expect(manifestRows.map(({ text }) => text)).toEqual(skillRows);
    expect(WHP_PROGRESS_ROWS).toEqual(manifestRows);
  });
});

function parseSkillChecklist(markdown: string): string[] {
  const section = markdown.match(
    /## Required progress checklist\r?\n([\s\S]*?)\r?\n## /,
  )?.[1];
  if (!section) throw new Error('required progress checklist was not found');
  return [...section.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1]!);
}

function parseManifestRows(
  markdown: string,
): Array<{ id: string; text: string }> {
  return [...markdown.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)]
    .map((match) => ({ id: match[1]!.trim(), text: match[2]!.trim() }))
    .filter(({ id }) => id !== 'id');
}
