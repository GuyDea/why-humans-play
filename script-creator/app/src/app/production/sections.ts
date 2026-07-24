import {
  exportMarkdown,
  schema,
} from '@whp/script-creator-editor-core';
import type { DraftDocument } from '../api/client';

export type ProductionSectionKind =
  | 'metadata'
  | 'beat'
  | 'personal-input'
  | 'viewer-application'
  | 'audit'
  | 'references'
  | 'named'
  | 'unknown';

export interface ProductionSubsection {
  id: string;
  kind: ProductionSectionKind;
  title: string;
  level: number;
  md: string;
  bodyMd: string;
  fields: Record<string, string>;
}

export interface ProductionSection {
  id: string;
  kind: ProductionSectionKind;
  title: string;
  level: number;
  md: string;
  beatId: string | null;
  beatTitle: string | null;
  subsections: ProductionSubsection[];
}

export interface PersonalInputRequest {
  id: string;
  decision: string;
  primaryPrompt: string;
  followUpPrompts: string;
  marker: string;
  md: string;
  bodyMd: string;
  beatId: string | null;
  beatTitle: string;
  narrativeJob: string;
  before: string;
  after: string;
  readOnly: boolean;
}

export interface ProductionDiagnostic {
  code:
    | 'duplicate-personal-input-id'
    | 'invalid-personal-input-id'
    | 'unmatched-personal-input-marker';
  message: string;
  ownerId: string | null;
}

export interface ProductionView {
  markdown: string;
  sections: ProductionSection[];
  personalInputs: PersonalInputRequest[];
  diagnostics: ProductionDiagnostic[];
}

export interface ValidatorLineDiagnostic {
  message: string;
  line: number | null;
}

export interface DiagnosticOwner {
  kind: 'narration-beat' | 'appendix-beat' | 'field';
  label: string;
}

export interface MappedValidatorDiagnostic
  extends ValidatorLineDiagnostic {
  owner: DiagnosticOwner | null;
}

export interface PersonalInputOperationContext {
  topicBrief: {
    topic: string;
    factualAnchors: string[];
    unknowns: string[];
  };
  approvedLessons: string[];
  creativeStatus: Record<string, unknown>;
  suppliedPersonalInput: string;
}

interface Heading {
  level: number;
  title: string;
  from: number;
  headingEnd: number;
}

interface NarrationBeat {
  id: string | null;
  title: string;
  narrativeJob: string;
  text: string;
}

const PERSONAL_INPUT_ID = /^PI-\d{3}$/u;
const MARKER = /<!-- (PI-\d{3}): Martin input -->/gu;

export function buildProductionView(
  document: DraftDocument,
): ProductionView {
  let markdown: string;
  try {
    markdown = exportedMarkdown(document);
  } catch {
    return {
      markdown: '',
      sections: [],
      personalInputs: [],
      diagnostics: [],
    };
  }
  const headings = markdownHeadings(markdown);
  const appendixIndex = headings.findIndex((heading) =>
    heading.level === 2
    && /^(?:Production )?Appendix(?:\s|$)/iu.test(heading.title));
  if (appendixIndex < 0) {
    return {
      markdown,
      sections: [],
      personalInputs: [],
      diagnostics: markerOnlyDiagnostics(markdown, new Set()),
    };
  }
  const appendixHeadings = headings.slice(appendixIndex + 1);
  const topHeadings = appendixHeadings.filter(({ level }) => level === 3);
  const beats = narrationBeats(document);
  const sections = topHeadings.map((heading, index) => {
    const end = topHeadings[index + 1]?.from ?? markdown.length;
    const md = markdown.slice(heading.from, end).replace(/\s+$/u, '');
    const beat = beatForProductionTitle(heading.title, beats);
    const nested = appendixHeadings.filter((candidate) =>
      candidate.level === 4
      && candidate.from > heading.from
      && candidate.from < end);
    return {
      id: `production-${heading.from}`,
      kind: topSectionKind(heading.title),
      title: heading.title,
      level: heading.level,
      md,
      beatId: beat?.id ?? null,
      beatTitle: beat?.title ?? null,
      subsections: nested.map((candidate, nestedIndex) => {
        const nestedEnd = nested[nestedIndex + 1]?.from ?? end;
        const nestedMd = markdown
          .slice(candidate.from, nestedEnd)
          .replace(/\s+$/u, '');
        return {
          id: `production-${candidate.from}`,
          kind: subsectionKind(candidate.title),
          title: candidate.title,
          level: candidate.level,
          md: nestedMd,
          bodyMd: markdown
            .slice(candidate.headingEnd, nestedEnd)
            .replace(/^\r?\n(?:\r?\n)?/u, '')
            .replace(/\s+$/u, ''),
          fields: namedFields(nestedMd),
        };
      }),
    } satisfies ProductionSection;
  });

  const diagnostics: ProductionDiagnostic[] = [];
  const personalInputs: PersonalInputRequest[] = [];
  const seenIds = new Set<string>();
  const personalInputIdCounts = new Map<string, number>();
  const narrationMarkerCounts = new Map<string, number>();
  for (const beat of beats) {
    for (const match of beat.text.matchAll(MARKER)) {
      const id = match[1]!;
      narrationMarkerCounts.set(
        id,
        (narrationMarkerCounts.get(id) ?? 0) + 1,
      );
    }
  }
  for (const section of sections) {
    for (const subsection of section.subsections) {
      if (subsection.kind !== 'personal-input') continue;
      const id = subsection.fields['ID'] ?? '';
      personalInputIdCounts.set(
        id,
        (personalInputIdCounts.get(id) ?? 0) + 1,
      );
    }
  }
  for (const section of sections) {
    const beat = beats.find(({ id }) => id === section.beatId)
      ?? beatForProductionTitle(section.title, beats);
    for (const subsection of section.subsections) {
      if (subsection.kind !== 'personal-input') continue;
      const id = subsection.fields['ID'] ?? '';
      const decision = subsection.fields['Decision'] ?? '';
      if (!PERSONAL_INPUT_ID.test(id)) {
        diagnostics.push({
          code: 'invalid-personal-input-id',
          message: `Invalid Personal input ID: ${id || '<empty>'}`,
          ownerId: id || null,
        });
        diagnostics.push({
          code: 'unmatched-personal-input-marker',
          message: `Personal input ${id || '<empty>'} has no mechanically matched marker.`,
          ownerId: id || null,
        });
        continue;
      }
      if (seenIds.has(id)) {
        diagnostics.push({
          code: 'duplicate-personal-input-id',
          message: `Duplicate Personal input ID: ${id}`,
          ownerId: id,
        });
        continue;
      }
      seenIds.add(id);
      const marker = `<!-- ${id}: Martin input -->`;
      const context = markerContext(beat?.text ?? '', marker);
      const duplicate = (personalInputIdCounts.get(id) ?? 0) > 1;
      const globalMarkerCount = narrationMarkerCounts.get(id) ?? 0;
      if (
        decision === 'INPUT-REQUESTED'
        && (
          context.count !== 1
          || globalMarkerCount !== 1
        )
      ) {
        diagnostics.push({
          code: 'unmatched-personal-input-marker',
          message:
            `Personal input ${id} has ${globalMarkerCount} matching narration markers overall and ${context.count} in its beat.`,
          ownerId: id,
        });
      }
      personalInputs.push({
        id,
        decision,
        primaryPrompt: subsection.fields['Primary prompt'] ?? '',
        followUpPrompts: subsection.fields['Follow-up prompts'] ?? '',
        marker,
        md: subsection.md,
        bodyMd: subsection.bodyMd,
        beatId: beat?.id ?? null,
        beatTitle: beat?.title ?? '',
        narrativeJob: beat?.narrativeJob ?? '',
        before: context.before,
        after: context.after,
        readOnly: decision !== 'INPUT-REQUESTED'
          || duplicate
          || context.count !== 1
          || globalMarkerCount !== 1,
      });
    }
  }
  diagnostics.push(...markerOnlyDiagnostics(markdown, seenIds));
  return { markdown, sections, personalInputs, diagnostics };
}

export function buildPersonalInputOperationInputs(
  request: PersonalInputRequest,
  context: PersonalInputOperationContext,
) {
  return {
    topic_brief: {
      topic: context.topicBrief.topic,
      factual_anchors: [...context.topicBrief.factualAnchors],
      unknowns: [...context.topicBrief.unknowns],
    },
    approved_lessons: [...context.approvedLessons],
    selection: request.marker,
    surrounding_context: {
      before: request.before,
      after: request.after,
    },
    beat_title: request.beatTitle,
    narrative_job: request.narrativeJob,
    creative_status: { ...context.creativeStatus },
    requested_scope: {
      kind: 'personal-input',
      personal_input_id: request.id,
    },
    supplied_personal_input: context.suppliedPersonalInput,
    personal_input_block: request.md,
  };
}

export function mapValidatorDiagnostics(
  markdown: string,
  diagnostics: readonly ValidatorLineDiagnostic[],
): MappedValidatorDiagnostic[] {
  const lines = markdown.split(/\r?\n/u);
  const owners: Array<DiagnosticOwner & {
    from: number;
    to: number;
  }> = [];
  let appendixLine = lines.findIndex((line) =>
    /^## (?:Production )?Appendix(?:\s|$)/iu.test(line)) + 1;
  if (appendixLine === 0) appendixLine = Number.POSITIVE_INFINITY;

  const narrationHeadings = lines.flatMap((line, index) =>
    /^## \d+\.\s+(.+)$/u.test(line) && index + 1 < appendixLine
      ? [{ line: index + 1, title: line.slice(3) }]
      : []);
  for (const [index, heading] of narrationHeadings.entries()) {
    owners.push({
      kind: 'narration-beat',
      label: heading.title,
      from: heading.line,
      to: narrationHeadings[index + 1]?.line
        ? narrationHeadings[index + 1]!.line - 1
        : appendixLine - 1,
    });
  }

  const appendixBeats = lines.flatMap((line, index) => {
    const match = /^### (Beat \d{2} — .+)$/u.exec(line);
    return match ? [{ line: index + 1, title: match[1]! }] : [];
  });
  for (const [index, heading] of appendixBeats.entries()) {
    const nextTopHeading = findNextLine(
      lines,
      heading.line + 1,
      /^### /u,
    );
    owners.push({
      kind: 'appendix-beat',
      label: heading.title,
      from: heading.line,
      to: Math.min(
        appendixBeats[index + 1]?.line
          ? appendixBeats[index + 1]!.line - 1
          : lines.length,
        nextTopHeading === null ? lines.length : nextTopHeading - 1,
      ),
    });
  }

  for (const [index, line] of lines.entries()) {
    const match = /^- \*\*([^*\r\n]+):\*\*/u.exec(line);
    if (!match) continue;
    const blank = findNextLine(lines, index + 2, /^\s*$/u);
    const heading = findNextLine(lines, index + 2, /^#{2,5} /u);
    const nextField = findNextLine(
      lines,
      index + 2,
      /^- \*\*[^*\r\n]+:\*\*/u,
    );
    owners.push({
      kind: 'field',
      label: match[1]!,
      from: index + 1,
      to: Math.min(
        blank === null ? lines.length : blank - 1,
        heading === null ? lines.length : heading - 1,
        nextField === null ? lines.length : nextField - 1,
      ),
    });
  }

  return diagnostics.map((diagnostic) => {
    if (diagnostic.line === null) return { ...diagnostic, owner: null };
    const candidates = owners.filter(({ from, to }) =>
      diagnostic.line! >= from && diagnostic.line! <= to);
    const owner = candidates.sort((left, right) =>
      right.from - left.from
      || ownerPriority(right.kind) - ownerPriority(left.kind))[0];
    return {
      ...diagnostic,
      owner: owner
        ? { kind: owner.kind, label: owner.label }
        : null,
    };
  });
}

function exportedMarkdown(document: DraftDocument): string {
  const result = exportMarkdown(schema.nodeFromJSON(document));
  if (!result.ok) {
    throw new Error(`production export blocked: ${result.blocked.join('; ')}`);
  }
  return result.markdown;
}

function markdownHeadings(markdown: string): Heading[] {
  return Array.from(markdown.matchAll(/^(#{2,5}) ([^\r\n]+)$/gmu))
    .flatMap((match) => {
      if (match.index === undefined) return [];
      return [{
        level: match[1]!.length,
        title: match[2]!,
        from: match.index,
        headingEnd: match.index + match[0].length,
      }];
    });
}

function topSectionKind(title: string): ProductionSectionKind {
  if (title === 'Script metadata') return 'metadata';
  if (/^Beat \d{2} — /u.test(title)) return 'beat';
  if (/audit/iu.test(title)) return 'audit';
  if (/references|source materials/iu.test(title)) return 'references';
  return 'unknown';
}

function subsectionKind(title: string): ProductionSectionKind {
  if (title === 'Personal input') return 'personal-input';
  if (title === 'Viewer application') return 'viewer-application';
  return 'named';
}

function namedFields(markdown: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(markdown.matchAll(/^- \*\*([^*\r\n]+):\*\* (.*)$/gmu))
      .map((match) => [match[1]!, match[2]!]),
  );
}

function narrationBeats(document: DraftDocument): NarrationBeat[] {
  const content = Array.isArray(document['content'])
    ? document['content']
    : [];
  return content.flatMap((value) => {
    const beat = record(value);
    if (beat?.['type'] !== 'beat') return [];
    const attrs = record(beat['attrs']) ?? {};
    const children = Array.isArray(beat['content']) ? beat['content'] : [];
    const text = children.flatMap((child) => {
      const node = record(child);
      return node?.['type'] === 'paragraph' ? nodeText(node) : [];
    }).join('\n\n');
    return [{
      id: stringOrNull(attrs['beatId']),
      title: stringValue(attrs['title']),
      narrativeJob: stringValue(attrs['narrativeJob']),
      text,
    }];
  });
}

function nodeText(node: Record<string, unknown>): string {
  const content = Array.isArray(node['content']) ? node['content'] : [];
  return content.map((child) => {
    const recordChild = record(child);
    if (recordChild?.['type'] === 'text') {
      return stringValue(recordChild['text']);
    }
    return recordChild ? nodeText(recordChild) : '';
  }).join('');
}

function beatForProductionTitle(
  productionTitle: string,
  beats: NarrationBeat[],
): NarrationBeat | null {
  const match = /^Beat (\d{2}) — (.+)$/u.exec(productionTitle);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  const expectedTitle = match[2]!;
  const indexed = beats[index];
  if (
    indexed
    && (
      indexed.title === expectedTitle
      || indexed.title.replace(/^\d+\.\s*/u, '') === expectedTitle
    )
  ) {
    return indexed;
  }
  const matches = beats.filter((beat) =>
    beat.title === expectedTitle
    || beat.title.replace(/^\d+\.\s*/u, '') === expectedTitle);
  return matches.length === 1 ? matches[0]! : null;
}

function markerContext(
  narration: string,
  marker: string,
): { before: string; after: string; count: number } {
  let count = 0;
  let first = -1;
  for (
    let index = narration.indexOf(marker);
    index >= 0;
    index = narration.indexOf(marker, index + marker.length)
  ) {
    if (first < 0) first = index;
    count += 1;
  }
  return first < 0
    ? { before: narration.trim(), after: '', count }
    : {
        before: narration.slice(0, first).trim(),
        after: narration.slice(first + marker.length).trim(),
        count,
      };
}

function markerOnlyDiagnostics(
  markdown: string,
  knownIds: Set<string>,
): ProductionDiagnostic[] {
  const diagnostics: ProductionDiagnostic[] = [];
  for (const match of markdown.matchAll(MARKER)) {
    const id = match[1]!;
    if (!knownIds.has(id)) {
      diagnostics.push({
        code: 'unmatched-personal-input-marker',
        message: `Narration marker ${id} has no matching Personal input block.`,
        ownerId: id,
      });
    }
  }
  return diagnostics;
}

function findNextLine(
  lines: string[],
  fromLine: number,
  pattern: RegExp,
): number | null {
  for (let index = Math.max(0, fromLine - 1); index < lines.length; index += 1) {
    pattern.lastIndex = 0;
    if (pattern.test(lines[index]!)) return index + 1;
  }
  return null;
}

function ownerPriority(
  kind: DiagnosticOwner['kind'],
): number {
  return kind === 'field' ? 3 : kind === 'appendix-beat' ? 2 : 1;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringOrNull(value: unknown): string | null {
  const string = stringValue(value);
  return string === '' ? null : string;
}
