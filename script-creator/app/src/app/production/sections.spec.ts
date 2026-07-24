import {
  parseMarkdown,
} from '@whp/script-creator-editor-core';
import { describe, expect, it } from 'vitest';
import {
  buildPersonalInputOperationInputs,
  buildProductionView,
  mapValidatorDiagnostics,
} from './sections';

describe('Phase-2 production sections', () => {
  it('mechanically classifies metadata, beat sections, named subsections, audits, references, and unknown headings', () => {
    const document = productionDocument();
    const view = buildProductionView(document);

    expect(view.sections.map(({ kind, title }) => [kind, title])).toEqual([
      ['metadata', 'Script metadata'],
      ['beat', 'Beat 01 — Opening'],
      ['audit', 'Editorial audit'],
      ['references', 'References and source materials'],
      ['unknown', 'Unrecognized production note'],
    ]);
    expect(view.sections.find(({ kind }) => kind === 'beat')).toMatchObject({
      beatId: expect.any(String),
      beatTitle: '1. Opening',
      subsections: expect.arrayContaining([
        expect.objectContaining({ title: 'Story function' }),
        expect.objectContaining({ title: 'Personal input' }),
        expect.objectContaining({ title: 'Viewer application' }),
      ]),
    });
    expect(view.sections.at(-1)?.md).toContain(
      'Preserve this unknown section exactly.',
    );
  });

  it('keeps ambiguous queue entries read-only and diagnoses invalid, duplicate, and unmatched IDs', () => {
    const markdown = productionMarkdown()
      .replace(
        '### Editorial audit',
        [
          '### Beat 02 — Duplicate',
          '',
          '#### Personal input',
          '- **ID:** PI-001',
          '- **Decision:** INPUT-REQUESTED',
          '- **Primary prompt:** Duplicate?',
          '- **Follow-up prompts:** Duplicate follow-up?',
          '',
          '#### Personal input',
          '- **ID:** PERSONAL-2',
          '- **Decision:** INPUT-REQUESTED',
          '- **Primary prompt:** Invalid?',
          '- **Follow-up prompts:** Invalid follow-up?',
          '',
          '### Editorial audit',
        ].join('\n'),
      );
    const document = parseMarkdown(markdown).toJSON();
    const view = buildProductionView(document);

    expect(view.personalInputs).toHaveLength(1);
    expect(view.personalInputs[0]).toMatchObject({
      id: 'PI-001',
      decision: 'INPUT-REQUESTED',
      primaryPrompt: 'What exact moment changed your view?',
      followUpPrompts: 'What did you see; what did you assume?',
      marker: '<!-- PI-001: Martin input -->',
      readOnly: true,
    });
    expect(view.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'duplicate-personal-input-id',
        'invalid-personal-input-id',
        'unmatched-personal-input-marker',
      ]),
    );
  });

  it('keeps OMIT and COMPLETED blocks read-only', () => {
    const completed = parseMarkdown(
      productionMarkdown()
        .replace('INPUT-REQUESTED', 'COMPLETED')
        .replace('> <!-- PI-001: Martin input -->\n', ''),
    ).toJSON();
    const omitted = parseMarkdown(
      productionMarkdown()
        .replace('INPUT-REQUESTED', 'OMIT')
        .replace('> <!-- PI-001: Martin input -->\n', ''),
    ).toJSON();

    expect(buildProductionView(completed).personalInputs[0]).toMatchObject({
      decision: 'COMPLETED',
      readOnly: true,
    });
    expect(buildProductionView(omitted).personalInputs[0]).toMatchObject({
      decision: 'OMIT',
      readOnly: true,
    });
  });

  it('diagnoses and disables a PI marker duplicated in another narration beat', () => {
    const document = parseMarkdown(
      productionMarkdown().replace(
        '## Appendix',
        [
          '## 2. Elsewhere',
          '',
          '> <!-- PI-001: Martin input -->',
          '',
          '## Appendix',
        ].join('\n'),
      ),
    ).toJSON();
    const view = buildProductionView(document);

    expect(view.personalInputs[0]).toMatchObject({
      id: 'PI-001',
      readOnly: true,
    });
    expect(view.diagnostics).toContainEqual({
      code: 'unmatched-personal-input-marker',
      message:
        'Personal input PI-001 has 2 matching narration markers overall and 1 in its beat.',
      ownerId: 'PI-001',
    });
  });

  it('builds a provenance-only scoped input from stored context and Martin-supplied text', () => {
    const request = buildProductionView(productionDocument())
      .personalInputs[0]!;
    const inputs = buildPersonalInputOperationInputs(request, {
      topicBrief: {
        topic: 'Why constraints create play',
        factualAnchors: ['Players accept the rule.'],
        unknowns: ['Which example survives?'],
      },
      approvedLessons: ['Keep it concrete.'],
      creativeStatus: { phase: 'creative-approved' },
      suppliedPersonalInput: 'I noticed it while teaching a friend.',
    });

    expect(inputs).toEqual({
      topic_brief: {
        topic: 'Why constraints create play',
        factual_anchors: ['Players accept the rule.'],
        unknowns: ['Which example survives?'],
      },
      approved_lessons: ['Keep it concrete.'],
      selection: '<!-- PI-001: Martin input -->',
      surrounding_context: {
        before: 'Opening narration.',
        after: 'Closing narration.',
      },
      beat_title: '1. Opening',
      narrative_job: '',
      creative_status: { phase: 'creative-approved' },
      requested_scope: {
        kind: 'personal-input',
        personal_input_id: 'PI-001',
      },
      supplied_personal_input: 'I noticed it while teaching a friend.',
      personal_input_block: request.md,
    });
    expect(JSON.stringify(inputs)).not.toMatch(
      /hook advice|production rubric|invent|summarize/i,
    );
  });

  it('maps validator lines mechanically to narration beats, appendix beats, named fields, or global', () => {
    const markdown = productionMarkdown();
    const lines = markdown.split('\n');
    const lineOf = (text: string) =>
      lines.findIndex((line) => line.includes(text)) + 1;
    const mapped = mapValidatorDiagnostics(markdown, [
      { message: 'Preamble issue.', line: 1 },
      {
        message: 'Narration issue.',
        line: lineOf('Opening narration.'),
      },
      {
        message: 'Appendix beat issue.',
        line: lineOf('Open the question.'),
      },
      {
        message: 'Field issue.',
        line: lineOf('INPUT-REQUESTED'),
      },
      { message: 'No line.', line: null },
    ]);

    expect(mapped.map(({ owner }) => owner)).toEqual([
      null,
      {
        kind: 'narration-beat',
        label: '1. Opening',
      },
      {
        kind: 'appendix-beat',
        label: 'Beat 01 — Opening',
      },
      {
        kind: 'field',
        label: 'Decision',
      },
      null,
    ]);
  });
});

function productionDocument() {
  return parseMarkdown(productionMarkdown()).toJSON();
}

function productionMarkdown(): string {
  return [
    '# Production fixture',
    '',
    '## 1. Opening',
    '',
    '> Opening narration.',
    '> <!-- PI-001: Martin input -->',
    '> Closing narration.',
    '',
    '## Appendix',
    '',
    '### Script metadata',
    '',
    '- **Status:** RESEARCH-DRAFT',
    '- **Title:** Production fixture',
    '',
    '### Beat 01 — Opening',
    '',
    '- **Time:** 00:00–00:30',
    '',
    '#### Story function',
    '',
    'Open the question.',
    '',
    '#### Personal input',
    '',
    '- **ID:** PI-001',
    '- **Decision:** INPUT-REQUESTED',
    '- **Story purpose:** Ground the question in a truthful moment.',
    '- **Primary prompt:** What exact moment changed your view?',
    '- **Follow-up prompts:** What did you see; what did you assume?',
    '- **Bridge in:** Exact stored bridge in.',
    '- **Bridge out:** Exact stored bridge out.',
    '- **Personal visuals:** Exact stored visual note.',
    '- **Omit when:** Exact stored omit condition.',
    '',
    '#### Viewer application',
    '',
    '- **Insight:** A bounded insight.',
    '',
    '### Editorial audit',
    '',
    '- Exact audit text.',
    '',
    '### References and source materials',
    '',
    '#### Evidence references',
    '',
    '##### F-001 — Source',
    '',
    '- **Status:** VERIFIED',
    '',
    '### Unrecognized production note',
    '',
    'Preserve this unknown section exactly.',
  ].join('\n');
}
