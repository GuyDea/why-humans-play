import { createHash } from 'node:crypto';

export const ARCHITECTURE_SECTIONS = [
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

export type ArchitectureSectionKey =
  typeof ARCHITECTURE_SECTIONS[number]['key'];

export const ARCHITECTURE_SECTION_KEYS = ARCHITECTURE_SECTIONS
  .map(({ key }) => key) as ArchitectureSectionKey[];

export interface ArchitectureSection {
  key: string;
  title: string;
  md: string;
}

const FIXED_SECTION_BY_TITLE = new Map<string, ArchitectureSectionKey>(
  ARCHITECTURE_SECTIONS.map(({ key, title }) => [title, key]),
);

export function splitArchitecture(markdown: string): ArchitectureSection[] {
  if (markdown === '') return [];

  const headings = [...markdown.matchAll(/^### ([^\r\n]+)(?:\r?\n|$)/gm)];
  const slices: Array<{ title: string; md: string }> = [];
  const firstHeadingIndex = headings[0]?.index;

  if (firstHeadingIndex === undefined || firstHeadingIndex > 0) {
    slices.push({
      title: '',
      md: markdown.slice(0, firstHeadingIndex),
    });
  }

  for (const [index, heading] of headings.entries()) {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? markdown.length;
    slices.push({
      title: heading[1]!,
      md: markdown.slice(start, end),
    });
  }

  const seenFixed = new Set<ArchitectureSectionKey>();
  const opaqueOccurrences = new Map<string, number>();
  return slices.map(({ title, md }) => {
    const fixedKey = FIXED_SECTION_BY_TITLE.get(title);
    if (fixedKey !== undefined && !seenFixed.has(fixedKey)) {
      seenFixed.add(fixedKey);
      return { key: fixedKey, title, md };
    }
    return {
      key: opaqueKey(title, opaqueOccurrences),
      title,
      md,
    };
  });
}

export function joinArchitecture(
  sections: readonly ArchitectureSection[],
): string {
  return sections.map(({ md }) => md).join('');
}

export function renderApprovedArchitecture(input: {
  title: string;
  approvedDate: string;
  approvedMd: string;
}): string {
  return [
    `# ${input.title}`,
    '',
    `- **Approval date:** ${input.approvedDate}`,
    '- **Status:** approved',
    '',
    input.approvedMd,
  ].join('\n');
}

function opaqueKey(
  title: string,
  occurrences: Map<string, number>,
): string {
  const digest = createHash('sha256').update(title).digest('hex').slice(0, 16);
  const occurrence = (occurrences.get(digest) ?? 0) + 1;
  occurrences.set(digest, occurrence);
  return occurrence === 1
    ? `opaque-${digest}`
    : `opaque-${digest}-${occurrence}`;
}
